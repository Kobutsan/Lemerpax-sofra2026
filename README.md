# Galerie photo — Soirée Lemer Pax × SoFRa

Galerie privée (code d'accès partagé) pour présenter et télécharger les photos
de la soirée à Cala d'Orzu, Corse. Next.js (App Router) + Vercel Blob.

## Architecture

- **Les photos ne sont JAMAIS dans le repo Git** ni servies en assets
  statiques. Tout passe par Vercel Blob (store **public** — voir
  « Compromis de sécurité » ci-dessous).
- L'app lit un manifeste committé (`data/photos.json`) — elle ne liste
  jamais le bucket à la volée.
- Le zip « Tout télécharger » est pré-généré en local par le script
  d'ingestion (une fonction serverless dépasserait ses limites
  mémoire/durée) et son URL est stockée dans `data/archive.json`.
- Contrôle d'accès : code validé côté serveur (`/api/access`, comparaison
  à temps constant), cookie de session JWT signé httpOnly/secure/lax,
  `middleware.ts` protège `/galerie` et `/api/download/*`.
- Anti-indexation : `app/robots.ts` (Disallow all), metadata
  `robots: noindex` sur toutes les pages, header `X-Robots-Tag` global,
  et `robots.txt` uploadé à la racine du store Blob.

## Mise en route

```bash
npm install

# 1. Lier le projet Vercel et créer le store Blob (PUBLIC — définitif)
vercel link
vercel blob create-store galerie-sofra --access public

# 2. Variables d'environnement (local)
vercel env pull .env.local
# puis compléter .env.local avec :
#   ACCESS_CODE=<code choisi par Lemer Pax>
#   SESSION_SECRET=$(openssl rand -base64 48)

# 3. Déclarer ACCESS_CODE et SESSION_SECRET côté Vercel aussi
vercel env add ACCESS_CODE
vercel env add SESSION_SECRET

# 4. Dev
npm run dev
```

## Ingestion des photos

```bash
# Déposer les originaux dans :
#   raw-photos/<Nom du photographe 1>/...
#   raw-photos/<Nom du photographe 2>/...
# (le nom du dossier devient le crédit photographe)

npm run ingest               # photos + zip
npm run ingest -- --skip-zip # photos seulement
npm run ingest -- --force    # ré-uploade tout

# Puis committer le manifeste et déployer :
git add data/photos.json data/archive.json
git commit -m "Ingestion photos"
vercel deploy --prod
```

L'ingestion est idempotente : l'id de chaque photo est le hash de son
contenu, les photos déjà présentes dans le manifeste sont ignorées.

## Assets à fournir (placeholders en attendant)

- `public/cover.jpg` — photo plein écran de la baie au coucher de soleil
  (écran d'accès ; un dégradé s'affiche en attendant).
- Logo Lemer Pax (`app/page.tsx` affiche le nom en texte pour l'instant).
- Le code d'accès (`ACCESS_CODE`) et les noms des photographes (dossiers
  de `raw-photos/`) ne sont pas inventés — à fournir.

## Compromis de sécurité (à connaître)

Les pages et les routes de téléchargement sont protégées par session, mais
les fichiers eux-mêmes sont sur un store Blob **public** : les URLs sont
non devinables (hash de contenu + hostname de store aléatoire) mais
quiconque possède une URL exacte peut y accéder. C'est le modèle
« unlisted » classique pour des galeries privées d'événement, et c'est ce
qui permet de servir les images directement depuis le CDN (rapide, peu
coûteux). Si un cloisonnement strict était exigé, il faudrait un store
*private* + livraison de chaque image via une Function (coût et latence
supérieurs).

Rappel hors périmètre dev : information / RGPD des personnes identifiables
sur les photos.

## Coûts à surveiller

- Zip > 512 Mo : jamais mis en cache CDN → chaque téléchargement est un
  cache MISS facturé (Blob Data Transfer + Fast Origin Transfer).
- Tarification Blob régionalisée — vérifier le dashboard Vercel pour la
  région du store.
