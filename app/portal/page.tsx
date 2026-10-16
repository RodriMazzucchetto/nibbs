import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { assertAdmin, getAssinaturaAtiva, getCaixas, getPortalInicio, getProfile } from "@/lib/portal-data";
import { getAsaasSubscription, listAsaasSubscriptionPayments } from "@/lib/asaas";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalApp } from "@/components/portal/PortalApp";
import "../globals-portal.css";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/entrar");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/entrar");

  let assinatura = await getAssinaturaAtiva(user.id, user.email);
  let invoices: Array<{
    id: string;
    status: string;
    value: number;
    dueDate: string;
    invoiceUrl?: string;
    description?: string;
  }> = [];

  if (assinatura?.asaas_subscription_id) {
    try {
      const sub = await getAsaasSubscription(assinatura.asaas_subscription_id);
      if (sub.nextDueDate && sub.nextDueDate !== assinatura.proxima_cobranca) {
        const admin = createAdminClient();
        await admin
          .from("assinaturas")
          .update({ proxima_cobranca: sub.nextDueDate, atualizado_em: new Date().toISOString() })
          .eq("id", assinatura.id);
        assinatura = { ...assinatura, proxima_cobranca: sub.nextDueDate };
      }
      invoices = await listAsaasSubscriptionPayments(assinatura.asaas_subscription_id);
    } catch {
      // Portal continua mesmo se o Asaas estiver fora
    }
  }

  const [caixas, inicio, admin] = await Promise.all([
    getCaixas(user.id),
    getPortalInicio(),
    assertAdmin(user.id, user.email),
  ]);

  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, "") || null;

  return (
    <PortalApp
      profile={profile}
      assinatura={assinatura}
      caixas={caixas}
      inicio={inicio}
      invoices={invoices}
      whatsapp={whatsapp}
      isAdmin={admin}
    />
  );
}
