import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs"; // node:crypto requis

/**
 * Validation du code d'accès — CÔTÉ SERVEUR uniquement.
 * Comparaison à temps constant : on hache les deux valeurs en SHA-256
 * (longueur fixe) puis timingSafeEqual. Le code attendu ne transite
 * jamais vers le client.
 */
export async function POST(request: Request) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.json(
      { error: "Configuration serveur incomplète (ACCESS_CODE manquant)." },
      { status: 500 }
    );
  }

  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (typeof code !== "string" || code.length === 0 || code.length > 256) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Code insensible à la casse (et aux espaces de bord) : on normalise les
  // deux valeurs avant le hachage — la comparaison reste à temps constant.
  const normalize = (value: string) => value.trim().toUpperCase();
  const submitted = createHash("sha256").update(normalize(code), "utf8").digest();
  const expected = createHash("sha256").update(normalize(accessCode), "utf8").digest();

  if (!timingSafeEqual(submitted, expected)) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
