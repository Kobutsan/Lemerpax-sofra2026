import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Protège la galerie (et sa lightbox, qui en fait partie) ainsi que toutes
 * les routes de téléchargement. Rien n'est atteignable sans cookie de
 * session valide — la validation a lieu ici, côté serveur, jamais en JS client.
 *
 * (proxy.ts = nouveau nom de middleware.ts depuis Next 16.)
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/galerie/:path*", "/api/download/:path*"],
};
