import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

const Schema = z
  .object({
    senha: z.string().min(8).max(72),
    senha2: z.string().min(8).max(72),
  })
  .refine((v) => v.senha === v.senha2, { message: "As senhas não batem" });

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
    return NextResponse.json({ error: "Confira a senha (mín. 8 e iguais)." }, { status: 400 });
  }

  const { error } = await auth.auth.updateUser({ password: body.senha });
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a senha." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
