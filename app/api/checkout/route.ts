import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";

const CheckoutSchema = z.object({
  priceId: z.string().startsWith("price_"),
  plano: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, plano } = CheckoutSchema.parse(body);

    const origin = request.headers.get("origin") ?? "https://assine.nibbs.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { plano },
      success_url: `${origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}`,
      locale: "pt-BR",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
