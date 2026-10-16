import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/portal-data";

export const runtime = "nodejs";

const Schema = z.object({
  userId: z.string().uuid(),
  mes: z.string().trim().min(1).max(40),
  ano: z.number().int().min(2024).max(2100),
  regiao: z.string().trim().max(80).optional(),
  codigo_rastreio: z.string().trim().min(3).max(80),
  status: z.enum(["separando", "enviada", "entregue"]),
});

export async function POST(request: NextRequest) {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email || !(await assertAdmin(user.id, user.email))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Confira os campos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("caixas").insert({
    user_id: body.userId,
    mes: body.mes,
    ano: body.ano,
    regiao: body.regiao || null,
    codigo_rastreio: body.codigo_rastreio,
    status: body.status,
    entregue_em: body.status === "entregue" ? new Date().toISOString().slice(0, 10) : null,
  });

  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
