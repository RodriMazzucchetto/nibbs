import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Schema = z.object({
  motivo: z.string().trim().min(2).max(200),
});

export async function POST(request: NextRequest) {
  const auth = await createAuthServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Informe o motivo." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const agora = new Date().toISOString();

  const { data: byUser } = await supabase
    .from("assinaturas")
    .select("id")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: byEmail } = byUser
    ? { data: null }
    : await supabase
        .from("assinaturas")
        .select("id")
        .eq("email", user.email.toLowerCase())
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

  const id = byUser?.id ?? byEmail?.id;
  if (!id) return NextResponse.json({ error: "Nenhuma assinatura encontrada." }, { status: 404 });

  const { error } = await supabase
    .from("assinaturas")
    .update({
      cancelamento_solicitado_em: agora,
      motivo_cancelamento: body.motivo,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Não foi possível registrar." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
