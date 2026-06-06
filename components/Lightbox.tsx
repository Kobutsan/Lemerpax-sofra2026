"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import type { Photo } from "@/lib/types";
import { DownloadIcon, PrintIcon } from "@/components/icons";
import { downloadHref, printPhoto } from "@/lib/photo-actions";

type Props = {
  photos: Photo[];
  index: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
};

const SWIPE_THRESHOLD_PX = 48;

export default function Lightbox({ photos, index, onNavigate, onClose }: Props) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  // Navigation clavier
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext, onClose]);

  // Verrouille le scroll de la page derrière la lightbox
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${photos.length}`}
      className="lightbox-in fixed inset-0 z-50 flex flex-col bg-white/75 backdrop-blur-2xl"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (delta > SWIPE_THRESHOLD_PX) goPrev();
        else if (delta < -SWIPE_THRESHOLD_PX) goNext();
      }}
    >
      {/* Barre supérieure */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-ink sm:px-6">
        <span className="text-xs tabular-nums text-ink/60">
          {index + 1}&nbsp;/&nbsp;{photos.length}
          {photo.photographer && (
            <span className="ml-3 hidden text-ink/45 sm:inline">
              © {photo.photographer}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={downloadHref(photo.originalUrl)}
            download
            className="flex items-center gap-2 rounded-full border border-sea-deep/25 px-4 py-1.5 text-xs tracking-wide text-sea-deep transition hover:border-sea-deep/50 hover:bg-sea-deep/5"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Télécharger l&rsquo;original</span>
          </a>
          <button
            type="button"
            onClick={() => printPhoto(photo.displayUrl)}
            className="flex items-center gap-2 rounded-full border border-sea-deep/25 px-4 py-1.5 text-xs tracking-wide text-sea-deep transition hover:border-sea-deep/50 hover:bg-sea-deep/5"
          >
            <PrintIcon />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full px-3 py-1.5 text-xl leading-none text-ink/70 transition hover:bg-sea-deep/5 hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative flex-1" onClick={onClose}>
        <div
          key={photo.id}
          className="lightbox-img absolute inset-2 sm:inset-6"
          onClick={(e) => {
            e.stopPropagation();
            // object-contain : l'<img> couvre tout le conteneur, bandes
            // vides comprises. On calcule la zone réellement occupée par
            // la photo — un clic en dehors ferme la lightbox.
            const rect = e.currentTarget.getBoundingClientRect();
            const scale = Math.min(
              rect.width / photo.width,
              rect.height / photo.height
            );
            const w = photo.width * scale;
            const h = photo.height * scale;
            const x0 = rect.left + (rect.width - w) / 2;
            const y0 = rect.top + (rect.height - h) / 2;
            const onPhoto =
              e.clientX >= x0 &&
              e.clientX <= x0 + w &&
              e.clientY >= y0 &&
              e.clientY <= y0 + h;
            if (!onPhoto) onClose();
          }}
        >
          <Image
            src={photo.displayUrl}
            alt={`Photo ${index + 1}`}
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={photo.blurDataURL}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Flèches — masquées sur mobile (swipe) */}
      <button
        type="button"
        onClick={goPrev}
        aria-label="Photo précédente"
        className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full p-3 text-3xl text-ink/50 transition hover:bg-sea-deep/5 hover:text-ink sm:block"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label="Photo suivante"
        className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full p-3 text-3xl text-ink/50 transition hover:bg-sea-deep/5 hover:text-ink sm:block"
      >
        ›
      </button>
    </div>
  );
}
