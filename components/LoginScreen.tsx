"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Écran d'accès plein écran : photo de la baie en Ken Burns lent, grain fin,
 * voile dégradé (dense en haut/bas, transparent au centre), champ pilule en
 * verre dépoli avec bouton flèche. Fade-out de la page entière à la
 * validation, avant redirection vers la galerie.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code || pending || success) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        // Flèche → coche, puis fondu de toute la page, puis redirection.
        setSuccess(true);
        setTimeout(() => setLeaving(true), 400);
        setTimeout(() => {
          router.replace("/galerie");
          router.refresh();
        }, 1150);
        return;
      }
      setError(
        res.status === 401
          ? "Code incorrect — vérifiez votre invitation."
          : "Une erreur est survenue. Réessayez."
      );
      setPending(false);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau.");
      setPending(false);
    }
  }

  return (
    <main
      className={`relative flex min-h-dvh flex-col overflow-hidden bg-sea-deep transition-opacity duration-700 ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Photo plein écran, zoom/balayage lent (Ken Burns) */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="animate-kenburns absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/cover.webp)" }}
        />
      </div>

      {/* Grain photographique fin */}
      <div aria-hidden className="grain absolute inset-0" />

      {/* Voile inversé : les bords restent lumineux (l'intérêt de la photo),
          l'assombrissement monte progressivement vers la bande centrale,
          là où vivent les textes */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,47,69,0.18) 0%, rgba(13,47,69,0.30) 30%, rgba(13,47,69,0.46) 52%, rgba(13,47,69,0.34) 76%, rgba(13,47,69,0.22) 100%)",
        }}
      />

      {/* Halo radial doux derrière le bloc central : renforce juste sous les
          textes, fondu progressif vers les bords */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 52% at 50% 55%, rgba(13,47,69,0.36) 0%, rgba(13,47,69,0.20) 55%, transparent 82%)",
        }}
      />

      {/* Logo Lemer Pax, discret, en haut à gauche */}
      <header className="relative z-10 flex items-center justify-start px-6 pt-6 sm:px-10 sm:pt-8">
        {/* <img> simples : l'optimiseur next/image refuse les SVG par défaut
            et n'apporte rien sur des logos de quelques Ko. Version blanche
            via filtre CSS (les deux fichiers ont un fond transparent). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-lemer-pax.webp"
          alt="Lemer Pax"
          width={410}
          height={94}
          className="h-5 w-auto opacity-90 brightness-0 invert sm:h-6"
        />
      </header>

      {/* Bloc central */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p
          className="appear flex items-center gap-3 font-display text-xs font-medium tracking-[0.28em] text-white/85 uppercase drop-shadow-[0_1px_6px_rgba(13,47,69,0.7)] sm:text-sm"
          style={{ animationDelay: "0.15s" }}
        >
          <span aria-hidden className="inline-block size-1.5 bg-white/85" />
          SOFRA&nbsp;2026
        </p>

        <h1 className="mt-7 font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.94] font-bold tracking-[-0.02em] text-white uppercase drop-shadow-[0_2px_16px_rgba(13,47,69,0.45)]">
          <span className="line-mask">
            <span
              className="line-up title-outline-light"
              style={{ animationDelay: "0.3s" }}
            >
              Soirée
            </span>
          </span>
          <span className="line-mask">
            <span className="line-up" style={{ animationDelay: "0.42s" }}>
              Lemer&nbsp;Pax
            </span>
          </span>
        </h1>

        {/* Sous-titre en petites capitales espacées : fait écho à l'eyebrow,
            composition symétrique autour du titre */}
        <p
          className="appear mt-6 font-display text-xs font-medium tracking-[0.28em] text-white/85 uppercase drop-shadow-[0_1px_6px_rgba(13,47,69,0.7)] sm:text-sm"
          style={{ animationDelay: "0.6s" }}
        >
          Mercredi 10 juin 2026&nbsp;·&nbsp;Cala&nbsp;d&rsquo;Orzu&nbsp;·&nbsp;Corse
        </p>

        {/* Champ pilule en verre dépoli */}
        <form
          onSubmit={handleSubmit}
          className={`appear mt-12 w-full max-w-md sm:mt-14 ${error ? "animate-shake" : ""}`}
          style={{ animationDelay: "0.75s" }}
        >
          <div className="relative">
            <label htmlFor="access-code" className="sr-only">
              Code d&rsquo;accès
            </label>
            <input
              id="access-code"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              maxLength={64}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="Code d’accès"
              disabled={success}
              className={`h-14 w-full rounded-full border bg-sea-deep/25 pr-16 pl-7 font-display text-sm tracking-[0.3em] text-white uppercase shadow-[0_4px_24px_rgba(13,47,69,0.35)] backdrop-blur-md transition outline-none placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-white/70 focus:bg-sea-deep/35 sm:h-16 sm:pr-[4.5rem] sm:text-base ${
                error
                  ? "border-coral/90"
                  : "border-white/45 focus:border-white/85"
              }`}
            />
            <button
              type="submit"
              disabled={pending || success || code.length === 0}
              aria-label="Entrer"
              className="group absolute top-1/2 right-2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sea-deep shadow-md transition hover:bg-linen disabled:opacity-60 sm:size-12"
            >
              {success ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 10.5l4 4 8-9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path
                    d="M3 10h13m0 0l-5.5-5.5M16 10l-5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <p
            role={error ? "alert" : undefined}
            className={`mt-4 text-xs drop-shadow-[0_1px_6px_rgba(13,47,69,0.7)] transition-colors sm:text-sm ${
              error ? "text-coral" : "text-white/80"
            }`}
          >
            {error ?? "Saisissez le code reçu avec votre invitation."}
          </p>
        </form>
      </div>

      {/* Pied de page */}
      <footer className="relative z-10 px-6 pb-6 text-center sm:pb-8">
        <p className="appear font-display text-[0.65rem] tracking-[0.18em] text-white/65 uppercase sm:text-xs" style={{ animationDelay: "0.9s" }}>
          Accès réservé aux invités&nbsp;·&nbsp;Lemer&nbsp;Pax&nbsp;×&nbsp;SoFRa
        </p>
      </footer>
    </main>
  );
}
