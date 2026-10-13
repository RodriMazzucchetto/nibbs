import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase/server";
import { sendSubscriptionWelcome } from "@/lib/resend";

// Necessário: desabilitar body parsing do Next.js para validar assinatura Stripe
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] Assinatura inválida:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode !== "subscription") return NextResponse.json({ ok: true });

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const email = session.customer_details?.email ?? "";
    const nome = session.customer_details?.name ?? "";
    const plano = session.metadata?.plano ?? "";

    const supabase = createServerClient();
    await supabase.from("assinaturas").insert({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plano,
      email,
      nome,
      status: "active",
    });

    if (email && nome) {
      await sendSubscriptionWelcome({ nome, email, plano });
    }
  }

  return NextResponse.json({ ok: true });
}
