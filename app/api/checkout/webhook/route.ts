import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendSubscriptionWelcome } from "@/lib/resend";

export const runtime = "nodejs";

// Asaas envia webhooks via POST com JSON — sem assinatura por padrão
// Para segurança: validar IP de origem (opcional) ou usar token no header
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Eventos de assinatura confirmada
    if (
      event.event === "PAYMENT_CONFIRMED" ||
      event.event === "PAYMENT_RECEIVED"
    ) {
      const payment = event.payment;

      // Só processa pagamentos de assinaturas recorrentes
      if (!payment?.subscription) return NextResponse.json({ ok: true });

      const supabase = createServerClient();

      // Evita duplicatas
      const { data: existing } = await supabase
        .from("assinaturas")
        .select("id")
        .eq("asaas_subscription_id", payment.subscription)
        .single();

      if (!existing) {
        const { data: customer } = await supabase
          .from("assinaturas")
          .insert({
            asaas_customer_id: payment.customer,
            asaas_subscription_id: payment.subscription,
            plano: payment.externalReference ?? "desconhecido",
            email: payment.billingInfo?.email ?? "",
            nome: payment.billingInfo?.name ?? "",
            status: "active",
          })
          .select()
          .single();

        if (customer?.email && customer?.nome) {
          await sendSubscriptionWelcome({
            nome: customer.nome,
            email: customer.email,
            plano: customer.plano,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook asaas]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
