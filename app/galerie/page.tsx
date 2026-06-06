import type { Metadata } from "next";
import photosJson from "@/data/photos.json";
import archiveJson from "@/data/archive.json";
import type { Archive, Photo } from "@/lib/types";
import Gallery from "@/components/Gallery";
import Parallax from "@/components/Parallax";
import Particles from "@/components/Particles";
import { DownloadIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Galerie — Lemer Pax × SoFRa",
};

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1).replace(".", ",")} Go`;
  return `${Math.round(bytes / 1e6)} Mo`;
}

export default function GaleriePage() {
  const photos = photosJson as Photo[];
  const archive = archiveJson as Archive;
  const photographers = [
    ...new Set(photos.map((p) => p.photographer).filter(Boolean)),
  ];

  const marqueeItems: Array<
    { type: "text"; value: string } | { type: "logo"; src: string; height: string }
  > = [
    { type: "text", value: "SOFRA 2026" },
    { type: "logo", src: "/logo-sofra.svg", height: "h-5" },
    { type: "text", value: "Société Française de Radiopharmacie" },
    { type: "text", value: "Mercredi 10 juin 2026" },
    { type: "text", value: "Cala d’Orzu — Corse" },
    { type: "logo", src: "/logo-lemer-pax.webp", height: "h-3.5" },
    { type: "text", value: "Lemer Pax — Protecting Life" },
    {
      type: "text",
      value:
        photos.length > 0
          ? `${photos.length} photographies`
          : "Bientôt disponibles",
    },
    { type: "text", value: "Une soirée au bord de la Méditerranée" },
    { type: "text", value: "Merci à tous les invités" },
  ];
  const marqueeHalf = Array.from({ length: 2 }).flatMap(() => marqueeItems);

  return (
    <div className="min-h-dvh overflow-x-clip">
      {/* Rideau d'entrée */}
      <div aria-hidden className="curtain">
        <span className="curtain-label">Lemer&nbsp;Pax&nbsp;—&nbsp;SOFRA&nbsp;2026</span>
      </div>

      {/* Barre fixe minimale : logo + actions */}
      <nav className="sticky top-0 z-40 border-b border-ink/10 bg-linen/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3.5 sm:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-lemer-pax.webp"
            alt="Lemer Pax"
            width={410}
            height={94}
            className="h-4 w-auto sm:h-5"
          />
          <div className="flex items-center gap-5 sm:gap-7">
            {archive.url && (
              <a
                href="/api/download/zip"
                className="flex items-center gap-2 font-display text-[0.7rem] leading-none font-medium tracking-[0.16em] text-ink/70 uppercase transition hover:text-ink"
              >
                <DownloadIcon className="shrink-0" />
                <span className="hidden sm:inline">Tout télécharger</span>
                <span className="text-ink/40">
                  {archive.size > 0 && formatSize(archive.size)}
                </span>
              </a>
            )}
            <form action="/api/logout" method="POST" className="flex items-center">
              <button
                type="submit"
                className="font-display text-[0.7rem] leading-none font-medium tracking-[0.16em] text-ink/45 uppercase transition hover:text-ink"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* En-tête éditorial : titre géant révélé ligne par ligne, mot de
          remerciement en colonne droite. Fond : mesh gradient + particules. */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-aurora-1 absolute -top-40 -left-32 size-[34rem] rounded-full bg-sea/10 blur-3xl" />
          <div className="animate-aurora-2 absolute top-8 right-[-12%] h-[26rem] w-[40rem] rounded-full bg-olive/10 blur-3xl" />
          <div className="animate-aurora-3 absolute bottom-[-35%] left-1/3 h-[22rem] w-[34rem] rounded-full bg-sand-deep/25 blur-3xl" />
        </div>
        <Particles className="pointer-events-none absolute inset-0 size-full" />

        <div className="relative mx-auto max-w-[1600px] px-4 pt-16 sm:px-8 sm:pt-24">
          <p
            className="appear flex items-center gap-3 font-display text-[0.7rem] font-medium tracking-[0.3em] text-olive uppercase"
            style={{ animationDelay: "1s" }}
          >
            <span aria-hidden className="inline-block size-1.5 bg-olive" />
            SOFRA 2026&nbsp;—&nbsp;Mercredi 10 juin 2026
          </p>

          <div className="mt-8 grid gap-10 sm:grid-cols-12 sm:items-end sm:gap-8">
            <Parallax speed={0.08} className="sm:col-span-8">
              <h1 className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.94] font-bold tracking-[-0.02em] text-sea-deep uppercase">
                <span className="line-mask">
                  <span
                    className="line-up title-outline"
                    style={{ animationDelay: "1.05s" }}
                  >
                    Soirée
                  </span>
                </span>
                <span className="line-mask">
                  <span className="line-up" style={{ animationDelay: "1.18s" }}>
                    Lemer&nbsp;Pax
                  </span>
                </span>
              </h1>
              <p
                className="appear mt-5 font-display text-sm font-medium tracking-[0.34em] text-sea-deep/60 uppercase sm:text-base"
                style={{ animationDelay: "1.35s" }}
              >
                Édition 2026
              </p>
            </Parallax>

            <div
              className="appear sm:col-span-4 sm:pb-4"
              style={{ animationDelay: "1.45s" }}
            >
              {/* Les deux organisations, en pied de colonne annotation */}
              <div className="flex items-center gap-5 pb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-sofra.svg"
                  alt="SoFRa — Société Française de Radiopharmacie"
                  width={107}
                  height={50}
                  className="h-9 w-auto"
                />
                <span aria-hidden className="h-7 w-px bg-ink/15" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-lemer-pax.webp"
                  alt="Lemer Pax"
                  width={410}
                  height={94}
                  className="h-4 w-auto"
                />
              </div>
              <div className="border-t border-ink/15 pt-5">
              <p className="font-display text-[0.65rem] font-medium tracking-[0.26em] text-ink/40 uppercase">
                Le mot de l&rsquo;équipe
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/65">
                Merci d&rsquo;avoir partagé cette soirée avec nous. Vous
                trouverez ici l&rsquo;ensemble des photographies de la soirée,
                à revivre et à télécharger librement. Nous espérons avoir le
                plaisir de vous retrouver pour la prochaine édition.
              </p>
              <p className="mt-4 font-display text-[0.7rem] font-medium tracking-[0.18em] text-olive uppercase">
                — L&rsquo;équipe Lemer&nbsp;Pax
              </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bande défilante */}
        <div className="marquee relative mt-14 border-y border-ink/15 py-3">
          <div className="marquee-track font-display text-[0.7rem] font-medium tracking-[0.26em] text-ink/50 uppercase">
            {[0, 1].map((half) => (
              <span
                key={half}
                aria-hidden={half === 1}
                className="flex shrink-0 items-center"
              >
                {marqueeHalf.map((item, i) => (
                  <span key={i} className="flex items-center">
                    {item.type === "text" ? (
                      <span className="px-6">{item.value}</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.src}
                        alt=""
                        className={`mx-6 ${item.height} w-auto opacity-70`}
                      />
                    )}
                    <span aria-hidden className="text-olive">
                      ·
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-2 pt-8 pb-32 sm:px-3">
        <Gallery photos={photos} />
      </main>

      {/* Statement de clôture */}
      <footer className="border-t border-ink/10 px-4 py-16 text-center sm:px-8 sm:py-24">
        <p className="font-display text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.98] font-bold tracking-[-0.02em] text-sea-deep uppercase">
          <span className="title-outline block">À très vite,</span>
          <span className="block">on l&rsquo;espère</span>
        </p>
        {photographers.length > 0 && (
          <p className="mt-10 font-display text-[0.7rem] tracking-[0.2em] text-ink/45 uppercase">
            Photographies&nbsp;: {photographers.join(" · ")}
          </p>
        )}
        <p className="mt-3 font-display text-[0.7rem] tracking-[0.2em] text-ink/35 uppercase">
          Galerie privée — merci de ne pas diffuser le lien ni le code
          d&rsquo;accès
        </p>
      </footer>
    </div>
  );
}
