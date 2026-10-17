import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AsaasError,
  createAsaasPayment,
  createAsaasSubscription,
  deleteAsaasSubscription,
  getAsaasPixQrCode,
  getFirstSubscriptionPayment,
  redact,
  upsertAsaasCustomer,
  type AsaasCartao,
  type AsaasTitular,
} from "@/lib/asaas";
import { criarOuAtualizarConta } from "@/lib/conta";
import { aplicarDesconto, marcarCupomUsado, validarCupom } from "@/lib/cupons";
import { PLANOS } from "@/lib/planos";
import { excedeuLimite, ipDoCliente } from "@/lib/rate-limit";
import { cpfValido, hojeSaoPaulo, luhnValido, soDigitos, validadeValida } from "@/lib/validacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const texto = (max: number) => z.string().trim().min(1).max(max);

const CheckoutSchema = z.object({
  plano: z.string(),
  metodo: z.enum(["cartao", "pix"]),
  cliente: z.object({
    nome: texto(100).refine((v) => v.split(/\s+/).length >= 2),
    email: z.string().trim().email().max(120),
    cpf: z.string().refine(cpfValido),
    celular: z.string().refine((v) => [10, 11].includes(soDigitos(v).length)),
  }),
  endereco: z.object({
    cep: z.string().refine((v) => soDigitos(v).length === 8),
    rua: texto(120),
    numero: texto(20),
    complemento: z.string().trim().max(60).optional(),
    bairro: texto(80),
    cidade: texto(80),
    uf: z.string().trim().length(2),
  }),
  cartao: z
    .object({
      nome: texto(100),
      numero: z.string().refine(luhnValido),
      validade: z.string().refine(validadeValida),
      cvv: z.string().regex(/^\d{3,4}$/),
    })
    .optional(),
  // Conta Nibbs — nunca gravamos cartão; senha vai só para o Auth do Supabase (hash)
  senha: z.string().min(8).max(72),
  /** Cupom de 10% (ex.: presente de 3 meses) — só em assinatura */
  cupom: z.string().trim().max(40).optional(),
  // Campo invisível: só robôs preenchem
  website: z.string().optional(),
});

const SEM_CACHE = { "Cache-Control": "no-store" };

function responder(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: SEM_CACHE });
}

const PAGO = ["CONFIRMED", "RECEIVED"];
const EM_ANALISE = ["AWAITING_RISK_ANALYSIS", "PENDING"];

export async function POST(request: NextRequest) {
  let body: z.infer<typeof CheckoutSchema>;
  try {
    body = CheckoutSchema.parse(await request.json());
  } catch {
    return responder({ error: "Confira os dados do formulário." }, 400);
  }

  if (body.website) return responder({ error: "Não foi possível processar." }, 400);

  const plano = PLANOS[body.plano];
  if (!plano) return responder({ error: "Plano inválido." }, 400);
  if (body.metodo === "cartao" && !body.cartao) return responder({ error: "Informe os dados do cartão." }, 400);

  const ip = ipDoCliente(request.headers);
  if (await excedeuLimite(ip)) {
    return responder({ error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." }, 429);
  }

  const { cliente, endereco } = body;
  const cpf = soDigitos(cliente.cpf);
  const celular = soDigitos(cliente.celular);
  const cep = soDigitos(endereco.cep);
  const recorrente = plano.tipo === "assinatura";
  const hoje = hojeSaoPaulo();

  let valor = plano.valor;
  let cupomUsado: string | null = null;
  if (recorrente && body.cupom?.trim()) {
    const cupom = await validarCupom(body.cupom, cliente.email);
    if (!cupom) return responder({ error: "Cupom inválido ou já usado." }, 400);
    valor = aplicarDesconto(plano.valor, cupom.desconto_pct);
    cupomUsado = cupom.codigo;
  }

  const descricao = recorrente
    ? `Clube de assinatura Nibbs · Plano ${plano.nome}${cupomUsado ? ` · cupom ${cupomUsado}` : ""}`
    : `Nibbs · ${plano.nome} (pagamento único, sem renovação)`;

  try {
    const customer = await upsertAsaasCustomer({
      name: cliente.nome,
      email: cliente.email,
      cpfCnpj: cpf,
      mobilePhone: celular,
      postalCode: cep,
      address: endereco.rua,
      addressNumber: endereco.numero,
      complement: endereco.complemento || undefined,
      province: endereco.bairro,
    });

    let cartao: AsaasCartao | undefined;
    let titular: AsaasTitular | undefined;
    if (body.metodo === "cartao" && body.cartao) {
      const [mes, ano] = body.cartao.validade.split("/");
      cartao = {
        holderName: body.cartao.nome,
        number: soDigitos(body.cartao.numero),
        expiryMonth: mes,
        expiryYear: `20${ano}`,
        ccv: body.cartao.cvv,
      };
      titular = {
        name: cliente.nome,
        email: cliente.email,
        cpfCnpj: cpf,
        postalCode: cep,
        addressNumber: endereco.numero,
        addressComplement: endereco.complemento || undefined,
        phone: celular,
        mobilePhone: celular,
      };
    }

    const billingType = body.metodo === "cartao" ? "CREDIT_CARD" : "PIX";
    const comum = {
      customer: customer.id,
      billingType,
      value: valor,
      description: descricao,
      externalReference: plano.slug,
      creditCard: cartao,
      creditCardHolderInfo: titular,
      remoteIp: cartao ? ip : undefined,
    } as const;

    let pagamento;
    let assinaturaId: string | undefined;
    if (recorrente) {
      const assinatura = await createAsaasSubscription({ ...comum, cycle: "MONTHLY", nextDueDate: hoje });
      assinaturaId = assinatura.id;
      pagamento = await getFirstSubscriptionPayment(assinatura.id);
    } else {
      pagamento = await createAsaasPayment({ ...comum, dueDate: hoje });
    }

    if (!pagamento) throw new Error("Cobrança não encontrada após a criação");

    // Zera referência local ao cartão o quanto antes (não vai para banco nem log)
    cartao = undefined;
    titular = undefined;

    const criarConta = async () => {
      try {
        await criarOuAtualizarConta({
          nome: cliente.nome,
          email: cliente.email,
          senha: body.senha,
          cpf,
          celular,
          cep,
          rua: endereco.rua,
          numero: endereco.numero,
          complemento: endereco.complemento,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          uf: endereco.uf,
        });
      } catch (err) {
        console.error("[checkout] conta", err instanceof Error ? err.message : "erro");
      }
    };

    const aposSucesso = async () => {
      await criarConta();
      if (cupomUsado) await marcarCupomUsado(cupomUsado).catch(() => {});
    };

    if (body.metodo === "pix") {
      await aposSucesso();
      const pix = await getAsaasPixQrCode(pagamento.id);
      return responder({
        status: "pix",
        paymentId: pagamento.id,
        pix: { img: pix.encodedImage, payload: pix.payload },
      });
    }

    if (PAGO.includes(pagamento.status)) {
      await aposSucesso();
      return responder({ status: "pago" });
    }
    if (EM_ANALISE.includes(pagamento.status)) {
      await aposSucesso();
      return responder({ status: "analise", paymentId: pagamento.id });
    }

    if (assinaturaId) await deleteAsaasSubscription(assinaturaId).catch(() => {});
    return responder({ error: "O cartão foi recusado. Confira os dados ou use outro cartão." }, 402);
  } catch (err) {
    if (err instanceof AsaasError && err.status === 400) {
      const motivo = err.descriptions[0];
      return responder({ error: motivo || "Não foi possível concluir o pagamento. Confira os dados." }, 402);
    }
    console.error("[checkout]", redact(err instanceof Error ? err.message : "erro desconhecido"));
    return responder({ error: "Não foi possível concluir o pagamento agora. Tente de novo em instantes." }, 500);
  }
}
