import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { assertAdmin } from "@/lib/portal-data";
import { LoginForm } from "@/components/portal/LoginForm";
import { NibbsLogo } from "@/components/NibbsLogo";
import "../globals-portal.css";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (await assertAdmin(user.id, user.email)) redirect("/admin");
    redirect("/portal");
  }

  return (
    <div className="nb-portal" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <nav style={{ width: "100%", maxWidth: 1120, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <NibbsLogo variant="lockup" size={28} ink="#261714" accent="#B3202F" />
        <a href="/assinatura" style={{ fontWeight: 700, fontSize: 15 }}>
          Ver planos
        </a>
      </nav>
      <div style={{ width: "100%", maxWidth: 440, padding: "48px 20px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 className="nb-display" style={{ fontSize: 42, margin: 0 }}>
          Entrar
        </h1>
        <p style={{ margin: 0, color: "#4A3430", lineHeight: 1.5 }}>
          Sua caixa, sua assinatura e seus dados — com o e-mail e a senha criados no checkout.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
