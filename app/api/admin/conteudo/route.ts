import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/portal-data";

export const runtime = "nodejs";

const Schema = z.object({
  titulo: z.string().trim().min(1).max(120),
  mensagem: z.string().trim().min(1).max(800),
  mes: z.string().trim().min(1).max(40),
  regiao: z.string().trim().min(1).max(80),
  status_caixa: z.enum(["pagamento", "separando", "enviada", "entregue"]),
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
  const { error } = await supabase.from("portal_inicio").upsert({
    id: 1,
    ...body,
    atualizado_em: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
