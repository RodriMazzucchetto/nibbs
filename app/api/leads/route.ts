import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { sendLeadNotification, sendLeadConfirmation } from "@/lib/resend";

const LeadSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  empresa: z.string().optional(),
  telefone: z.string().optional(),
  num_funcionarios: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lead = LeadSchema.parse(body);

    const supabase = createServerClient();
    const { error } = await supabase.from("leads").insert({
      ...lead,
      origem: request.headers.get("origin") ?? "business.nibbs.com",
    });

    if (error) throw error;

    await Promise.all([
      sendLeadNotification(lead),
      sendLeadConfirmation(lead),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("[leads]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
