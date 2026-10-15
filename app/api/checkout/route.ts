import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAsaasPaymentLink } from "@/lib/asaas";
import { PLANOS } from "@/lib/planos";

const CheckoutSchema = z.object({
  plano: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plano: slug } = CheckoutSchema.parse(body);

    const plano = PLANOS[slug];
    if (!plano) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const recorrente = plano.tipo === "assinatura";

    const link = await createAsaasPaymentLink({
      name: `Nibbs — ${plano.nome}`,
      description: recorrente
        ? `Clube de assinatura Nibbs · Plano ${plano.nome}`
        : `Nibbs · ${plano.nome} (pagamento único, sem renovação)`,
      value: plano.valor,
      billingType: "UNDEFINED", // cliente escolhe PIX, cartão ou boleto
      chargeType: recorrente ? "RECURRENT" : "DETACHED",
      subscriptionCycle: recorrente ? "MONTHLY" : undefined,
      dueDateLimitDays: 3,
      isAddressRequired: true,
      externalReference: plano.slug,
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
