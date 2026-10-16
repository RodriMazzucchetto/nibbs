import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteAsaasSubscription,
  getAsaasSubscription,
  updateAsaasSubscription,
} from "@/lib/asaas";
import { PLANOS } from "@/lib/planos";

export function addMonthsISO(isoDate: string, months: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // Evita estourar o dia (ex.: 31 → mês curto)
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, last));
  return dt.toISOString().slice(0, 10);
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function getAssinaturaDoUsuario(userId: string, email: string) {
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
    .eq("email", email.toLowerCase())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmail && !byEmail.user_id) {
    await supabase.from("assinaturas").update({ user_id: userId }).eq("id", byEmail.id);
  }
  return byEmail;
}

function isFakeAsaas(id: string | null | undefined) {
  return !id || id.startsWith("sub_teste") || id.startsWith("cus_teste") || id.startsWith("pay_teste");
}

async function syncProxima(assinaturaId: string, asaasSubId: string | null) {
  if (!asaasSubId || isFakeAsaas(asaasSubId)) return null;
  const sub = await getAsaasSubscription(asaasSubId);
  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      proxima_cobranca: sub.nextDueDate ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", assinaturaId);
  return sub;
}

export async function trocarPlano(opts: {
  userId: string;
  email: string;
  planoSlug: string;
}) {
  const plano = PLANOS[opts.planoSlug];
  if (!plano || plano.tipo !== "assinatura") throw new Error("Plano inválido.");

  const row = await getAssinaturaDoUsuario(opts.userId, opts.email);
  if (!row?.asaas_subscription_id) throw new Error("Assinatura não encontrada.");
  if (row.cancelamento_solicitado_em) throw new Error("Há um cancelamento em andamento.");

  if (!isFakeAsaas(row.asaas_subscription_id)) {
    const sub = await getAsaasSubscription(row.asaas_subscription_id);
    await updateAsaasSubscription(row.asaas_subscription_id, {
      value: plano.valor,
      description: `Clube de assinatura Nibbs · Plano ${plano.nome}`,
      externalReference: plano.slug,
      updatePendingPayments: true,
      ...(sub.nextDueDate ? { nextDueDate: sub.nextDueDate } : {}),
    });
  }

  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      plano: plano.nome,
      plano_slug: plano.slug,
      troca_plano_solicitada: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", row.id);

  await syncProxima(row.id, row.asaas_subscription_id);
  return { plano: plano.nome, valor: plano.valor };
}

export async function pularProximaCaixa(opts: { userId: string; email: string }) {
  const row = await getAssinaturaDoUsuario(opts.userId, opts.email);
  if (!row?.asaas_subscription_id) throw new Error("Assinatura não encontrada.");
  if (row.status !== "active") throw new Error("Assinatura não está ativa.");

  let base = row.proxima_cobranca || hojeISO();
  if (!isFakeAsaas(row.asaas_subscription_id)) {
    const sub = await getAsaasSubscription(row.asaas_subscription_id);
    base = sub.nextDueDate || base;
  }
  const novaData = addMonthsISO(base, 1);

  if (!isFakeAsaas(row.asaas_subscription_id)) {
    await updateAsaasSubscription(row.asaas_subscription_id, {
      nextDueDate: novaData,
      updatePendingPayments: true,
      status: "ACTIVE",
    });
  }

  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      proxima_cobranca: novaData,
      caixa_pulada_ate: novaData,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { proxima_cobranca: novaData };
}

export async function pausarTresMeses(opts: { userId: string; email: string }) {
  const row = await getAssinaturaDoUsuario(opts.userId, opts.email);
  if (!row?.asaas_subscription_id) throw new Error("Assinatura não encontrada.");
  if (row.status !== "active") throw new Error("Assinatura não está ativa.");

  let base = row.proxima_cobranca || hojeISO();
  if (!isFakeAsaas(row.asaas_subscription_id)) {
    const sub = await getAsaasSubscription(row.asaas_subscription_id);
    base = sub.nextDueDate || base;
  }
  const retorno = addMonthsISO(base, 3);

  if (!isFakeAsaas(row.asaas_subscription_id)) {
    await updateAsaasSubscription(row.asaas_subscription_id, {
      status: "INACTIVE",
      nextDueDate: retorno,
      updatePendingPayments: true,
    });
  }

  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      status: "paused",
      pausada_ate: retorno,
      proxima_cobranca: retorno,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { pausada_ate: retorno };
}

export async function reativarAssinatura(opts: { userId: string; email: string }) {
  const row = await getAssinaturaDoUsuario(opts.userId, opts.email);
  if (!row?.asaas_subscription_id) throw new Error("Assinatura não encontrada.");

  const retorno = row.pausada_ate || row.proxima_cobranca || addMonthsISO(hojeISO(), 1);

  if (!isFakeAsaas(row.asaas_subscription_id)) {
    await updateAsaasSubscription(row.asaas_subscription_id, {
      status: "ACTIVE",
      nextDueDate: retorno,
    });
  }

  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      status: "active",
      pausada_ate: null,
      cancelamento_solicitado_em: null,
      motivo_cancelamento: null,
      proxima_cobranca: retorno,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { proxima_cobranca: retorno };
}

export async function cancelarAssinaturaDefinitivo(opts: {
  userId: string;
  email: string;
  motivo: string;
}) {
  const row = await getAssinaturaDoUsuario(opts.userId, opts.email);
  if (!row?.asaas_subscription_id) throw new Error("Assinatura não encontrada.");

  if (!isFakeAsaas(row.asaas_subscription_id)) {
    // Soft cancel no Asaas (para de gerar cobranças). Cobranças já geradas ficam.
    await updateAsaasSubscription(row.asaas_subscription_id, { status: "INACTIVE" }).catch(async () => {
      await deleteAsaasSubscription(row.asaas_subscription_id);
    });
  }

  const supabase = createAdminClient();
  await supabase
    .from("assinaturas")
    .update({
      status: "cancelled",
      cancelamento_solicitado_em: new Date().toISOString(),
      motivo_cancelamento: opts.motivo,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { ok: true };
}
