// Utilitaires client pour les actions photo (téléchargement, impression).

/**
 * URL de téléchargement forcé :
 * - en prod (Vercel Blob), `?download=1` pose Content-Disposition: attachment ;
 * - en démo locale (même origine), c'est l'attribut `download` du lien qui agit.
 * On combine donc toujours les deux.
 */
export function downloadHref(originalUrl: string): string {
  return `${originalUrl}?download=1`;
}

/**
 * Impression d'une photo : fenêtre dédiée, plein format, impression lancée
 * au chargement de l'image puis fermeture après le dialogue.
 */
export function printPhoto(url: string) {
  const win = window.open("", "_blank");
  if (!win) return; // popup bloquée — rien à faire de plus
  const safeUrl = url.replace(/"/g, "&quot;");
  win.document.write(`<!doctype html>
<html><head><title>Impression</title><style>
  @page { margin: 0; }
  html, body { margin: 0; height: 100%; }
  body { display: flex; align-items: center; justify-content: center; background: #fff; }
  img { max-width: 100%; max-height: 100vh; }
</style></head>
<body>
  <img src="${safeUrl}" onload="setTimeout(function(){ window.onafterprint = function(){ window.close(); }; window.print(); }, 150)" alt="">
</body></html>`);
  win.document.close();
}
