import { createServerClient } from "@/lib/supabase/server";

const JANELA_MINUTOS = 15;
const MAX_TENTATIVAS = 6;

// Registra a tentativa e diz se o IP passou do limite. Se o banco falhar, não bloqueia a venda.
export async function excedeuLimite(ip: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();

    const { count } = await supabase
      .from("checkout_tentativas")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("criado_em", desde);

    if ((count ?? 0) >= MAX_TENTATIVAS) return true;

    await supabase.from("checkout_tentativas").insert({ ip });
    return false;
  } catch (err) {
    console.error("[rate-limit]", err instanceof Error ? err.message : "erro");
    return false;
  }
}

export function ipDoCliente(headers: Headers) {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}
