import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAsaasPaymentLink } from "@/lib/asaas";

const CheckoutSchema = z.object({
  plano: z.string(),
  valor: z.number().positive(),
  ciclo: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plano, valor, ciclo } = CheckoutSchema.parse(body);

    const link = await createAsaasPaymentLink({
      name: `Nibbs — ${plano}`,
      description: `Clube de assinatura Nibbs · Plano ${plano}`,
      value: valor,
      billingType: "UNDEFINED", // deixa o cliente escolher (PIX, cartão, boleto)
      chargeType: "RECURRENT",
      subscriptionCycle: ciclo,
      externalReference: plano,
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
