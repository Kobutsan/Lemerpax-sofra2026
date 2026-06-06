import { NextResponse } from "next/server";
import archive from "@/data/archive.json";
import type { Archive } from "@/lib/types";

/**
 * Téléchargement du zip pré-généré (cf. scripts/ingest.ts).
 * Cette route est protégée par middleware.ts : l'URL Blob du zip n'est
 * jamais exposée dans le HTML — on redirige seulement les sessions valides.
 * `?download=1` force le Content-Disposition: attachment côté Blob.
 */
export async function GET() {
  const { url } = archive as Archive;
  if (!url) {
    return NextResponse.json(
      { error: "Archive non disponible. Lancer `npm run ingest`." },
      { status: 404 }
    );
  }
  return NextResponse.redirect(`${url}?download=1`, 302);
}
