import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Déconnexion : efface le cookie de session puis renvoie vers l'écran
 * d'accès. POST (via le petit formulaire de la nav) + redirection 303
 * pour que le navigateur recharge en GET.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
