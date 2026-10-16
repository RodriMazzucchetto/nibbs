import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { sendSubscriptionWelcome } from "@/lib/resend";
import { getAsaasCustomer, getAsaasPaymentLink, getAsaasSubscription, redact } from "@/lib/asaas";
import { PLANOS } from "@/lib/planos";

export const runtime = "nodejs";

// Token definido em Asaas > Integrações > Webhooks, enviado no header asaas-access-token
function isAuthorized(request: NextRequest) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  const received = request.headers.get("asaas-access-token");
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const event = await request.json();

    if (event.event !== "PAYMENT_CONFIRMED" && event.event !== "PAYMENT_RECEIVED") {
      return NextResponse.json({ ok: true });
    }

    const payment = event.payment;
    if (!payment?.id || !payment?.customer) return NextResponse.json({ ok: true });

    const supabase = createServerClient();

    // Renovações mensais e o segundo evento (CONFIRMED → RECEIVED) não criam registro novo
    const dedupe = payment.subscription
      ? supabase.from("assinaturas").select("id").eq("asaas_subscription_id", payment.subscription)
      : supabase.from("assinaturas").select("id").eq("asaas_payment_id", payment.id);
    const { data: existing } = await dedupe.maybeSingle();
    if (existing) return NextResponse.json({ ok: true });

    let slug: string | undefined = payment.externalReference;
    if (!slug && payment.subscription) {
      slug = (await getAsaasSubscription(payment.subscription)).externalReference;
    }
    if (!slug && payment.paymentLink) {
      slug = (await getAsaasPaymentLink(payment.paymentLink)).externalReference;
    }
    const plano = slug ? PLANOS[slug] : undefined;

    const cliente = await getAsaasCustomer(payment.customer);

    const email = (cliente.email ?? "").trim().toLowerCase();
    const { data: perfil } = email
      ? await supabase.from("profiles").select("id").eq("email", email).maybeSingle()
      : { data: null };

    const { data: assinatura, error } = await supabase
      .from("assinaturas")
      .insert({
        asaas_customer_id: payment.customer,
        asaas_subscription_id: payment.subscription ?? null,
        asaas_payment_id: payment.id,
        tipo: plano?.tipo ?? (payment.subscription ? "assinatura" : "presente"),
        plano: plano?.nome ?? slug ?? "desconhecido",
        plano_slug: plano?.slug ?? slug ?? null,
        email,
        nome: cliente.name ?? "",
        status: "active",
        user_id: perfil?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Falha de e-mail não pode devolver erro ao Asaas: o pagamento já foi gravado
    if (assinatura?.email && assinatura?.nome) {
      try {
        await sendSubscriptionWelcome({
          nome: assinatura.nome,
          email: assinatura.email,
          plano: assinatura.plano,
        });
      } catch (err) {
        console.error("[webhook asaas] e-mail de boas-vindas", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook asaas]", redact(err instanceof Error ? err.message : JSON.stringify(err)));
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
