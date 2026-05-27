import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JadualPengguna } from "@/components/admin/jadual-pengguna";

export default async function HalamanPengguna() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profil?.rol !== "admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm">
        Akses ditolak. Hanya pentadbir boleh melihat halaman ini.
      </div>
    );
  }

  const [{ data: senaraiPengguna }, { data: senaraiPO }] = await Promise.all([
    supabase
      .from("pengguna")
      .select(
        "id, email, nama_penuh, no_telefon, rol, pusat_operasi_id, dicipta_pada"
      )
      .order("dicipta_pada", { ascending: false }),
    supabase.from("pusat_operasi").select("id, kod, nama").order("kod"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pengguna</h2>
        <p className="text-sm text-muted-foreground">
          Urus rol dan Pusat Operasi yang ditugaskan kepada pengguna.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Senarai Pengguna ({senaraiPengguna?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <JadualPengguna
            senaraiPengguna={senaraiPengguna ?? []}
            senaraiPO={senaraiPO ?? []}
            penggunaSemasaId={user.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cipta Pengguna Baru</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Untuk cipta auditor baru, suruh mereka daftar sendiri di{" "}
          <code className="rounded bg-muted px-1">/daftar</code>. Selepas itu,
          tukar rol mereka di sini.
          <p className="mt-2 text-xs">
            (Cipta pengguna terus dari panel admin perlukan SUPABASE_SERVICE_ROLE_KEY.
            Boleh ditambah kemudian jika perlu.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
