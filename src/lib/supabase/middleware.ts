import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Konfigurasi Supabase tiada", { status: 500 });
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /share dan /api/laporan/kongsi dibenarkan tanpa auth — diakses via token
  const laluanAwam = ["/masuk", "/daftar", "/auth", "/sw.js", "/share", "/api/laporan/kongsi"];

  // /hasil dilindungi — mesti log masuk (dashboard umum dipindah ke dashboard-hasil)
  // Tiada bypass untuk /hasil di proxy lagi
  const adalahLaluanAwam = laluanAwam.some((p) => pathname.startsWith(p));

  if (!user && !adalahLaluanAwam && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    return NextResponse.redirect(url);
  }

  // Pengguna log masuk tidak diubah hala ke dashboard dari /share atau /api/laporan/kongsi
  if (
    user &&
    adalahLaluanAwam &&
    !pathname.startsWith("/share") &&
    !pathname.startsWith("/api/laporan/kongsi")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
