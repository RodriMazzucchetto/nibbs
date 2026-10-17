import { randomBytes } from "crypto";
import { createServerClient } from "@/lib/supabase/server";

export function gerarCodigoCupom() {
  return `NIBBS10-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function emitirCupomPresente3m(opts: {
  email: string;
  asaasPaymentId?: string | null;
}) {
  const supabase = createServerClient();
  const email = opts.email.trim().toLowerCase();
  if (!email) throw new Error("E-mail inválido para cupom");

  if (opts.asaasPaymentId) {
    const { data: ja } = await supabase
      .from("cupons")
      .select("codigo")
      .eq("asaas_payment_id", opts.asaasPaymentId)
      .maybeSingle();
    if (ja?.codigo) return ja.codigo as string;
  }

  for (let i = 0; i < 5; i++) {
    const codigo = gerarCodigoCupom();
    const { data, error } = await supabase
      .from("cupons")
      .insert({
        codigo,
        email,
        desconto_pct: 10,
        origem: "presente-3m",
        asaas_payment_id: opts.asaasPaymentId ?? null,
      })
      .select("codigo")
      .single();
    if (!error && data?.codigo) return data.codigo as string;
    if (error?.code !== "23505") throw error;
  }
  throw new Error("Não foi possível gerar cupom");
}

export async function validarCupom(codigoRaw: string, email: string) {
  const codigo = codigoRaw.trim().toUpperCase();
  if (!codigo) return null;
  const supabase = createServerClient();
  const { data } = await supabase.from("cupons").select("*").eq("codigo", codigo).maybeSingle();
  if (!data) return null;
  if (data.usado_em) return null;
  // Cupom é do presenteador — pode usar no e-mail da compra do presente ou outro; liberamos qualquer e-mail
  // mas tipicamente o mesmo comprador. Não amarramos rigidamente.
  void email;
  return data as {
    id: string;
    codigo: string;
    desconto_pct: number;
    email: string;
  };
}

export async function marcarCupomUsado(codigo: string, assinaturaId?: string | null) {
  const supabase = createServerClient();
  await supabase
    .from("cupons")
    .update({
      usado_em: new Date().toISOString(),
      usado_assinatura_id: assinaturaId ?? null,
    })
    .eq("codigo", codigo.trim().toUpperCase())
    .is("usado_em", null);
}

export function aplicarDesconto(valor: number, pct: number) {
  const v = Math.round(valor * (1 - pct / 100) * 100) / 100;
  return Math.max(0.01, v);
}
