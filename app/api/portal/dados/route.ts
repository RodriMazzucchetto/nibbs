import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Schema = z.object({
  nome: z.string().trim().min(2).max(100),
  celular: z.string().trim().max(20),
  cep: z.string().trim().max(12),
  rua: z.string().trim().max(120),
  numero: z.string().trim().max(20),
  complemento: z.string().trim().max(60).optional(),
  bairro: z.string().trim().max(80),
  cidade: z.string().trim().max(80),
  uf: z.string().trim().max(2),
});

export async function POST(request: NextRequest) {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Confira os campos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...body, complemento: body.complemento || null, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
