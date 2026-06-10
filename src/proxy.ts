import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/hasil")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Padankan semua laluan kecuali:
     * - _next/static (fail statik)
     * - _next/image (pengoptimum imej)
     * - favicon.ico, manifest, icons
     * - sw.js, sw-version.js (service worker tak boleh di-redirect)
     * - fail dengan sambungan (gambar, font, dll)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|sw-version.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
