import { NextRequest, NextResponse } from "next/server";
import { getAsaasPayment } from "@/lib/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const pagamento = await getAsaasPayment(id);
    const pago = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(pagamento.status);
    return NextResponse.json({ pago }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ pago: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
