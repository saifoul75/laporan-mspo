import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HalamanTetapan() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profil } = await supabase
    .from("pengguna")
    .select("nama_penuh, email, rol, no_telefon")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tetapan</h2>
        <p className="text-sm text-muted-foreground">Urus profil dan tetapan akaun.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Maklumat label="Nama" nilai={profil?.nama_penuh ?? "-"} />
          <Maklumat label="Email" nilai={profil?.email ?? "-"} />
          <Maklumat label="No. Telefon" nilai={profil?.no_telefon ?? "-"} />
          <Maklumat label="Rol" nilai={profil?.rol ?? "-"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Maklumat({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{nilai}</span>
    </div>
  );
}
