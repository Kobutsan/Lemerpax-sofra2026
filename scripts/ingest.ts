/**
 * Chaîne d'ingestion des photos — s'exécute EN LOCAL, jamais en serverless.
 *
 * Usage :
 *   npm run ingest                 # ingestion complète (photos + zip)
 *   npm run ingest -- --skip-zip   # photos seulement
 *   npm run ingest -- --force      # ré-uploade même les photos déjà ingérées
 *
 * Lit ./raw-photos/<photographe>/*.jpg|jpeg|png|webp
 * (les fichiers directement à la racine de raw-photos sont acceptés,
 * sans crédit photographe).
 *
 * Pour chaque photo :
 *   - id = hash SHA-256 du contenu (12 hex) → idempotent, URL non devinable
 *   - version display redimensionnée (2048 px max) → Blob `display/`
 *   - original tel quel → Blob `original/`
 *   - largeur/hauteur de l'original (orientation EXIF corrigée)
 *   - blurDataURL base64 (~24 px)
 * Écrit le manifeste data/photos.json — l'app ne liste JAMAIS le bucket.
 *
 * Génère aussi UN zip de tous les originaux, uploadé en multipart sur Blob
 * (data/archive.json) — pré-généré ici car une fonction serverless Vercel
 * dépasserait ses limites mémoire/durée.
 *
 * Uploade enfin un robots.txt à la racine du store Blob (recommandation
 * officielle Vercel pour empêcher l'indexation des blobs publics).
 */

import { put } from "@vercel/blob";
import sharp from "sharp";
import { ZipArchive } from "archiver";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Configuration

const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "raw-photos");
const DATA_DIR = path.join(ROOT, "data");
const MANIFEST_PATH = path.join(DATA_DIR, "photos.json");
const ARCHIVE_PATH = path.join(DATA_DIR, "archive.json");

const DISPLAY_MAX_PX = 2048; // bord long maximum de la version display
const DISPLAY_JPEG_QUALITY = 82;
const BLUR_WIDTH_PX = 24;
const UPLOAD_CONCURRENCY = 4;
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const BLOB_CACHE_LIMIT_BYTES = 512 * 1e6; // au-delà : cache MISS systématique (doc Vercel)

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const FORCE = process.argv.includes("--force");
const SKIP_ZIP = process.argv.includes("--skip-zip");

type PhotoEntry = {
  id: string;
  displayUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  blurDataURL: string;
  photographer: string;
};

type RawFile = { absPath: string; name: string; photographer: string };

// ---------------------------------------------------------------------------
// Helpers

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(ROOT, file));
    } catch {
      // fichier absent : on continue
    }
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}

async function scanRawDir(): Promise<RawFile[]> {
  let entries;
  try {
    entries = await readdir(RAW_DIR, { withFileTypes: true });
  } catch {
    console.error(
      `Dossier ${RAW_DIR} introuvable.\n` +
        "Créez ./raw-photos/<nom-du-photographe>/ et placez-y les photos."
    );
    process.exit(1);
  }

  const files: RawFile[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      const sub = await readdir(path.join(RAW_DIR, entry.name), {
        withFileTypes: true,
      });
      for (const f of sub) {
        if (f.isFile() && IMAGE_EXTENSIONS.has(path.extname(f.name).toLowerCase())) {
          files.push({
            absPath: path.join(RAW_DIR, entry.name, f.name),
            name: f.name,
            photographer: entry.name,
          });
        }
      }
    } else if (
      entry.isFile() &&
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push({
        absPath: path.join(RAW_DIR, entry.name),
        name: entry.name,
        photographer: "",
      });
    }
  }

  files.sort((a, b) =>
    `${a.photographer}/${a.name}`.localeCompare(`${b.photographer}/${b.name}`, "fr")
  );
  return files;
}

async function loadExistingManifest(): Promise<Map<string, PhotoEntry>> {
  try {
    const json: PhotoEntry[] = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    return new Map(json.map((p) => [p.id, p]));
  } catch {
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Traitement d'une photo

async function processPhoto(
  file: RawFile,
  existing: Map<string, PhotoEntry>,
  progress: { done: number; total: number }
): Promise<PhotoEntry> {
  const buffer = await readFile(file.absPath);
  const id = createHash("sha256").update(buffer).digest("hex").slice(0, 12);

  const alreadyDone = existing.get(id);
  if (alreadyDone && !FORCE) {
    progress.done++;
    console.log(
      `  [${progress.done}/${progress.total}] ${file.photographer}/${file.name} — déjà ingérée, ignorée`
    );
    return { ...alreadyDone, photographer: file.photographer };
  }

  // Dimensions de l'original, orientation EXIF corrigée
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Dimensions illisibles : ${file.absPath}`);
  }
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;

  // Version display : 2048 px max, JPEG progressif.
  // .rotate() sans argument applique l'orientation EXIF puis sharp retire
  // les métadonnées (EXIF/GPS) — la version affichée n'expose donc rien.
  const displayBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: DISPLAY_MAX_PX,
      height: DISPLAY_MAX_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: DISPLAY_JPEG_QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();

  // blurDataURL minuscule pour le chargement progressif
  const blurBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: BLUR_WIDTH_PX })
    .jpeg({ quality: 50 })
    .toBuffer();
  const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

  const ext = path.extname(file.name).toLowerCase();
  const blobOptions = {
    access: "public" as const,
    addRandomSuffix: false, // l'id (hash de contenu) rend déjà l'URL non devinable
    allowOverwrite: true, // idempotence des relances
    cacheControlMaxAge: ONE_YEAR_S, // blobs immuables (id = hash du contenu)
  };

  const [displayBlob, originalBlob] = await Promise.all([
    put(`display/${id}.jpg`, displayBuffer, {
      ...blobOptions,
      contentType: "image/jpeg",
    }),
    put(`original/${id}${ext}`, buffer, {
      ...blobOptions,
      contentType: CONTENT_TYPES[ext],
      multipart: buffer.length > 100 * 1e6,
    }),
  ]);

  progress.done++;
  console.log(
    `  [${progress.done}/${progress.total}] ${file.photographer}/${file.name} → ${id} (${width}×${height})`
  );

  return {
    id,
    displayUrl: displayBlob.url,
    originalUrl: originalBlob.url,
    width,
    height,
    blurDataURL,
    photographer: file.photographer,
  };
}

// ---------------------------------------------------------------------------
// Zip des originaux

async function buildAndUploadZip(files: RawFile[]) {
  console.log("\nGénération du zip des originaux…");
  const zipPath = path.join(os.tmpdir(), "lemerpax-sofra-originaux.zip");

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    // store (pas de compression) : les JPEG sont déjà compressés, deflate
    // ne ferait que ralentir pour ~0 % de gain.
    const archive = new ZipArchive({ store: true });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.on("warning", (err) => console.warn("  avertissement zip :", err.message));
    archive.pipe(output);

    const usedNames = new Set<string>();
    for (const file of files) {
      let name = path.posix.join(file.photographer || "photos", file.name);
      // collision improbable (même nom, même dossier) : suffixe numérique
      let n = 1;
      while (usedNames.has(name)) {
        const ext = path.extname(file.name);
        name = path.posix.join(
          file.photographer || "photos",
          `${path.basename(file.name, ext)}-${++n}${ext}`
        );
      }
      usedNames.add(name);
      archive.file(file.absPath, { name });
    }
    void archive.finalize();
  });

  const { size } = await stat(zipPath);
  console.log(`  Zip : ${(size / 1e6).toFixed(0)} Mo — upload multipart…`);
  if (size > BLOB_CACHE_LIMIT_BYTES) {
    console.warn(
      "  ⚠ Zip > 512 Mo : il ne sera jamais mis en cache CDN par Vercel Blob.\n" +
        "    Chaque téléchargement = cache MISS facturé (Blob Data Transfer +\n" +
        "    Fast Origin Transfer). Acceptable pour un événement ponctuel,\n" +
        "    mais à garder en tête côté coûts."
    );
  }

  const blob = await put(
    "archives/soiree-originaux.zip",
    createReadStream(zipPath),
    {
      access: "public",
      addRandomSuffix: true, // URL non devinable — elle n'est servie que via /api/download/zip
      allowOverwrite: true,
      multipart: true,
      contentType: "application/zip",
      cacheControlMaxAge: ONE_YEAR_S,
    }
  );

  await writeFile(
    ARCHIVE_PATH,
    JSON.stringify(
      {
        url: blob.url,
        size,
        count: files.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );
  await rm(zipPath);
  console.log(`  Archive uploadée → ${blob.url}`);
}

// ---------------------------------------------------------------------------
// Main

async function main() {
  loadEnv();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN manquant.\n" +
        "1. vercel blob create-store galerie-sofra --access public\n" +
        "2. vercel env pull .env.local\n" +
        "(le store doit être PUBLIC : ce mode est définitif à la création)"
    );
    process.exit(1);
  }

  const files = await scanRawDir();
  if (files.length === 0) {
    console.error(`Aucune image trouvée dans ${RAW_DIR}.`);
    process.exit(1);
  }
  const photographers = [...new Set(files.map((f) => f.photographer).filter(Boolean))];
  console.log(
    `${files.length} photos trouvées` +
      (photographers.length ? ` — photographes : ${photographers.join(", ")}` : "")
  );

  const existing = await loadExistingManifest();
  const progress = { done: 0, total: files.length };

  console.log("\nTraitement et upload des photos…");
  const photos = await mapLimit(files, UPLOAD_CONCURRENCY, (file) =>
    processPhoto(file, existing, progress)
  );

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(photos, null, 2) + "\n");
  console.log(`\nManifeste écrit : ${MANIFEST_PATH} (${photos.length} entrées)`);

  // robots.txt à la racine du store : empêche l'indexation des blobs
  // eux-mêmes (recommandation doc Vercel "public storage").
  await put("robots.txt", "User-agent: *\nDisallow: /\n", {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/plain",
    cacheControlMaxAge: 3600,
  });
  console.log("robots.txt déployé à la racine du store Blob.");

  if (SKIP_ZIP) {
    console.log("\n--skip-zip : zip non régénéré.");
  } else {
    await buildAndUploadZip(files);
  }

  console.log(
    "\nTerminé. Committez data/photos.json et data/archive.json puis déployez."
  );
}

main().catch((err) => {
  console.error("\nÉchec de l'ingestion :", err);
  process.exit(1);
});
