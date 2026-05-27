import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Padankan semua laluan kecuali:
     * - _next/static (fail statik)
     * - _next/image (pengoptimum imej)
     * - favicon.ico, manifest, icons
     * - fail dengan sambungan (gambar, font, dll)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
