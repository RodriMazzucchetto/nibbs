import { createAdminClient } from "@/lib/supabase/admin";

export type DadosConta = {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  celular: string;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

function emailAdmin(email: string) {
  const lista = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.trim().toLowerCase());
}

/** Cria (ou atualiza perfil de) conta. Nunca grava cartão. */
export async function criarOuAtualizarConta(dados: DadosConta) {
  const supabase = createAdminClient();
  const email = dados.email.trim().toLowerCase();
  const role = emailAdmin(email) ? "admin" : "assinante";

  const { data: perfilExistente } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId = perfilExistente?.id as string | undefined;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nome },
    });
    if (error || !data?.user) {
      // Conta Auth existe sem profile (retry): busca e segue
      const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const u = listed.data.users.find((x: { email?: string }) => x.email?.toLowerCase() === email);
      if (!u) throw error ?? new Error("Não foi possível criar a conta");
      userId = u.id;
    } else {
      userId = data.user.id;
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      nome: dados.nome,
      cpf: dados.cpf,
      celular: dados.celular,
      cep: dados.cep,
      rua: dados.rua,
      numero: dados.numero,
      complemento: dados.complemento || null,
      bairro: dados.bairro,
      cidade: dados.cidade,
      uf: dados.uf,
      role,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  return userId!;
}

export async function vincularAssinaturaPorEmail(email: string, userId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({ user_id: userId })
    .eq("email", email.trim().toLowerCase())
    .is("user_id", null);
}

export function isAdminEmail(email: string | undefined | null) {
  if (!email) return false;
  return emailAdmin(email);
}

export function whatsappUrl(mensagem: string) {
  const raw = (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, "");
  if (!raw) return null;
  return `https://wa.me/${raw}?text=${encodeURIComponent(mensagem)}`;
}
