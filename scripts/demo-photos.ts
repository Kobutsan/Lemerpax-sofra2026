/**
 * DÉMO UNIQUEMENT — génère ~50 photos factices (picsum.photos) pour
 * prévisualiser le design de la galerie SANS Vercel Blob :
 *   - fichiers dans public/demo/ (gitignorés, jamais committés)
 *   - manifeste data/photos.json pointant vers /demo/*.jpg
 *   - data/archive.json factice (pour voir le bouton « Tout télécharger »)
 *
 * Usage : npx tsx scripts/demo-photos.ts
 * Le vrai `npm run ingest` écrasera ces manifestes.
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DEMO_DIR = path.join(ROOT, "public", "demo");
const COUNT = 50;
const CONCURRENCY = 8;

// Formats variés pour une masonry réaliste (paysage, portrait, carré, pano)
const SHAPES: Array<[number, number]> = [
  [1600, 1067],
  [1600, 1067],
  [1067, 1600],
  [1600, 1200],
  [1600, 900],
  [1200, 1600],
  [1400, 1400],
];

type Entry = {
  id: string;
  displayUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  blurDataURL: string;
  photographer: string;
};

async function makePhoto(i: number): Promise<Entry | null> {
  const [width, height] = SHAPES[i % SHAPES.length];
  const url = `https://picsum.photos/seed/lpx-${i}/${width}/${height}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  photo ${i} : HTTP ${res.status}, ignorée`);
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  const display = await sharp(buffer)
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();
  const blur = await sharp(buffer)
    .resize({ width: 24 })
    .jpeg({ quality: 50 })
    .toBuffer();

  const file = `demo-${String(i).padStart(2, "0")}.jpg`;
  await writeFile(path.join(DEMO_DIR, file), display);

  return {
    id: `demo-${i}`,
    displayUrl: `/demo/${file}`,
    originalUrl: `/demo/${file}`,
    width,
    height,
    blurDataURL: `data:image/jpeg;base64,${blur.toString("base64")}`,
    // Noms volontairement génériques : les vrais crédits viendront des
    // dossiers raw-photos/<photographe>/ à l'ingestion réelle.
    photographer: i <= COUNT / 2 ? "Photographe A" : "Photographe B",
  };
}

async function main() {
  await mkdir(DEMO_DIR, { recursive: true });
  const photos: Entry[] = [];

  for (let start = 1; start <= COUNT; start += CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(CONCURRENCY, COUNT - start + 1) },
      (_, k) => makePhoto(start + k)
    );
    photos.push(...(await Promise.all(batch)).filter((p): p is Entry => p !== null));
    console.log(`${photos.length}/${COUNT}`);
  }

  await writeFile(
    path.join(ROOT, "data", "photos.json"),
    JSON.stringify(photos, null, 2) + "\n"
  );
  await writeFile(
    path.join(ROOT, "data", "archive.json"),
    JSON.stringify(
      {
        url: "https://example.com/demo-ne-pas-utiliser.zip", // factice
        size: 1_870_000_000,
        count: photos.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Manifeste démo écrit (${photos.length} photos).`);
}

main().catch((err) => {
  console.error("Échec :", err);
  process.exit(1);
});
