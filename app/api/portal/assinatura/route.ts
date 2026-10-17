import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import {
  cancelarAssinaturaDefinitivo,
  pausarTresMeses,
  pularProximaCaixa,
  reativarAssinatura,
  trocarPlano,
} from "@/lib/assinatura-ops";
import { AsaasError, redact } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("trocar_plano"),
    planoSlug: z.enum(["fundador-sempre", "fundador-simples", "entrada", "melhor-valor", "ultimate"]),
  }),
  z.object({ acao: z.literal("pular") }),
  z.object({ acao: z.literal("pausar") }),
  z.object({ acao: z.literal("reativar") }),
  z.object({ acao: z.literal("cancelar"), motivo: z.string().trim().min(2).max(200) }),
]);

export async function POST(request: NextRequest) {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const base = { userId: user.id, email: user.email };
    if (body.acao === "trocar_plano") {
      const r = await trocarPlano({ ...base, planoSlug: body.planoSlug });
      return NextResponse.json({
        ok: true,
        message: `Plano alterado para ${r.plano}. A próxima cobrança já usa o novo valor (R$ ${r.valor}).`,
      });
    }
    if (body.acao === "pular") {
      const r = await pularProximaCaixa(base);
      const [y, m, d] = r.proxima_cobranca.split("-");
      return NextResponse.json({
        ok: true,
        message: `Caixa pulada. Sem cobrança neste ciclo. Próxima cobrança em ${d}/${m}/${y}.`,
        proxima_cobranca: r.proxima_cobranca,
      });
    }
    if (body.acao === "pausar") {
      const r = await pausarTresMeses(base);
      const [y, m, d] = r.pausada_ate.split("-");
      return NextResponse.json({
        ok: true,
        message: `Assinatura pausada. Sem caixas e sem cobranças até ${d}/${m}/${y}. Você pode retomar antes se quiser.`,
        pausada_ate: r.pausada_ate,
      });
    }
    if (body.acao === "reativar") {
      const r = await reativarAssinatura(base);
      return NextResponse.json({
        ok: true,
        message: `Assinatura reativada. Próxima cobrança em ${r.proxima_cobranca.split("-").reverse().join("/")}.`,
      });
    }
    await cancelarAssinaturaDefinitivo({ ...base, motivo: body.motivo });
    return NextResponse.json({
      ok: true,
      message: "Assinatura cancelada. Não haverá novas cobranças.",
    });
  } catch (err) {
    if (err instanceof AsaasError) {
      const motivo = err.descriptions[0] || "O Asaas não aceitou a alteração.";
      // Tokenização: cartão recorrente às vezes bloqueia mudança de valor
      if (/token|cart[aã]o|credit.?card/i.test(motivo)) {
        return NextResponse.json(
          {
            error:
              "Não foi possível alterar automaticamente no cartão. Fale no WhatsApp que a gente conclui a mudança no Asaas.",
            whatsapp: true,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ error: motivo }, { status: 402 });
    }
    console.error("[portal assinatura]", redact(err instanceof Error ? err.message : "erro"));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Não foi possível concluir." },
      { status: 400 },
    );
  }
}
