import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/masuk");

  const { data: profil } = await supabase
    .from("pengguna")
    .select("nama_penuh, rol, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar rol={profil?.rol ?? "auditor"} />
      <div className="flex flex-1 flex-col">
        <TopBar
          nama={profil?.nama_penuh ?? user.email ?? "Pengguna"}
          rol={profil?.rol ?? "auditor"}
        />
        <main className="container flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
