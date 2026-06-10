// Klien Supabase tanpa sesi — digunakan HANYA untuk laluan awam /share/[token].
// Tidak menyimpan atau membaca kuki; sentiasa beroperasi sebagai peranan 'anon'.
// RLS polisi dalam migration 0018 mengawal apa yang 'anon' boleh baca.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Matikan penyimpanan sesi supaya klien ini tidak secara tidak sengaja
        // mengambil token auth dari localStorage dalam persekitaran browser.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
