/**
 * Cria (ou promove) o usuário admin.
 * Uso: node scripts/criar-admin.mjs email@dominio senha-segura "Seu Nome"
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v.replace(/^\\\$/, "$");
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const [email, senha, ...nomeParts] = process.argv.slice(2);
const nome = nomeParts.join(" ") || "Admin Nibbs";
if (!email || !senha || senha.length < 8) {
  console.error('Uso: node scripts/criar-admin.mjs email@dominio "senha-min-8" "Nome"');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const emailNorm = email.trim().toLowerCase();

const { data: perfil } = await supabase.from("profiles").select("id").eq("email", emailNorm).maybeSingle();
let userId = perfil?.id;

if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: emailNorm,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) {
    const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = listed?.users?.find((x) => x.email?.toLowerCase() === emailNorm);
    if (!u) {
      console.error(error.message);
      process.exit(1);
    }
    userId = u.id;
    await supabase.auth.admin.updateUserById(userId, { password: senha });
  } else {
    userId = data.user.id;
  }
} else {
  await supabase.auth.admin.updateUserById(userId, { password: senha });
}

const { error } = await supabase.from("profiles").upsert({
  id: userId,
  email: emailNorm,
  nome,
  role: "admin",
  atualizado_em: new Date().toISOString(),
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("Admin pronto:", emailNorm, "→ /entrar → /admin");
console.log("Lembre de colocar ADMIN_EMAIL=" + emailNorm + " no .env.local e na Vercel.");
