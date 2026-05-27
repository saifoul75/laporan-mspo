import Link from "next/link";
import { Butang } from "@/components/ui/butang";

export default function HalamanUtama() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            M
          </div>
          <span className="font-semibold">MSPO Audit</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/masuk">
            <Butang variant="ghost" size="sm">
              Log Masuk
            </Butang>
          </Link>
          <Link href="/daftar">
            <Butang size="sm">Daftar</Butang>
          </Link>
        </nav>
      </header>

      <section className="container mx-auto max-w-4xl py-20 text-center">
        <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          MS2530-2-2:2022
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
          Audit MSPO untuk RISDA Plantation
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Sistem audit dalaman MSPO untuk Pusat Operasi. Checklist berasaskan
          Master Checklist v6.5 dengan 5 prinsip, 28 kriteria dan 74 item
          semakan.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/masuk">
            <Butang size="lg">Log Masuk Auditor</Butang>
          </Link>
          <Link href="/daftar">
            <Butang size="lg" variant="outline">
              Daftar Akaun
            </Butang>
          </Link>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          <Ciri
            tajuk="Checklist Audit"
            penerangan="74 item semakan ikut Master Checklist v6.5 dengan status Y, N, NC, OFI, N/A, Pending."
          />
          <Ciri
            tajuk="Mod Luar Talian"
            penerangan="Isi checklist di kebun tanpa internet. Data di-sync automatik bila online."
          />
          <Ciri
            tajuk="GPS & Bukti Foto"
            penerangan="Tag lokasi setiap dapatan dan muat naik gambar bukti audit."
          />
          <Ciri
            tajuk="NC & OFI Tracking"
            penerangan="Jana CAR (Tindakan Pembetulan) dan OFI dengan PIC dan tarikh siap."
          />
          <Ciri
            tajuk="Laporan PDF"
            penerangan="Hasilkan Laporan Dapatan dan ringkasan audit dalam format PDF."
          />
          <Ciri
            tajuk="Multi-Pusat Operasi"
            penerangan="Urus audit untuk pelbagai PO dalam Wilayah Utara, Tengah, Selatan, Timur."
          />
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          MSPO Audit | MS2530-2-2:2022 | Bina untuk RISDA Plantation Sdn Bhd
        </div>
      </footer>
    </main>
  );
}

function Ciri({ tajuk, penerangan }: { tajuk: string; penerangan: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="font-semibold">{tajuk}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{penerangan}</p>
    </div>
  );
}
