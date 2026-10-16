import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/conta";

export async function getProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function getAssinaturaAtiva(userId: string, email: string) {
  const supabase = createAdminClient();
  const { data: byUser } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byUser) return byUser;

  const { data: byEmail } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmail && !byEmail.user_id) {
    await supabase.from("assinaturas").update({ user_id: userId }).eq("id", byEmail.id);
  }
  return byEmail;
}

export async function getCaixas(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("caixas")
    .select("*")
    .eq("user_id", userId)
    .order("ano", { ascending: false })
    .order("criado_em", { ascending: false });
  return data ?? [];
}

export async function getPortalInicio() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("portal_inicio").select("*").eq("id", 1).maybeSingle();
  return (
    data ?? {
      titulo: "Boas-vindas ao clube",
      mensagem: "Sua caixa está a caminho.",
      mes: "novembro",
      regiao: "Sul da Bahia",
      status_caixa: "separando",
    }
  );
}

export async function assertAdmin(userId: string, email: string | undefined) {
  if (isAdminEmail(email)) return true;
  const profile = await getProfile(userId);
  return profile?.role === "admin";
}

export async function listClientesAdmin() {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email, celular, cidade, uf, role, criado_em")
    .eq("role", "assinante")
    .order("criado_em", { ascending: false });

  const { data: assinaturas } = await supabase
    .from("assinaturas")
    .select("id, user_id, email, plano, status, cancelamento_solicitado_em, motivo_cancelamento, troca_plano_solicitada, criado_em")
    .order("criado_em", { ascending: false });

  const { data: caixas } = await supabase
    .from("caixas")
    .select("*")
    .order("criado_em", { ascending: false });

  return { profiles: profiles ?? [], assinaturas: assinaturas ?? [], caixas: caixas ?? [] };
}
