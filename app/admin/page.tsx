import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { assertAdmin, getPortalInicio, listClientesAdmin } from "@/lib/portal-data";
import { AdminApp } from "@/components/admin/AdminApp";
import "../globals-portal.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/entrar");
  if (!(await assertAdmin(user.id, user.email))) redirect("/portal");

  const [inicio, clientes] = await Promise.all([getPortalInicio(), listClientesAdmin()]);

  return (
    <AdminApp
      inicio={inicio}
      profiles={clientes.profiles}
      assinaturas={clientes.assinaturas}
      caixas={clientes.caixas}
    />
  );
}
