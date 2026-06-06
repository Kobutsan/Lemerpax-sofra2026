"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Photo } from "@/lib/types";
import Lightbox from "@/components/Lightbox";
import { DownloadIcon, PrintIcon } from "@/components/icons";
import { downloadHref, printPhoto } from "@/lib/photo-actions";

/**
 * Masonry calculée (chaque photo va dans la colonne la moins haute —
 * possible car le manifeste contient largeur/hauteur) + parallaxe
 * différentielle : au scroll, chaque colonne dérive à une vitesse
 * légèrement différente. Révélation au scroll des photos.
 */

// Vitesses de dérive par colonne — subtiles, désynchronisées
const COLUMN_SPEEDS = [0, 0.05, -0.035, 0.065];

type Item = { photo: Photo; index: number };

function useColumnCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 1280px)"),
      window.matchMedia("(min-width: 1024px)"),
      window.matchMedia("(min-width: 640px)"),
    ];
    const update = () =>
      setCount(
        queries[0].matches ? 4 : queries[1].matches ? 3 : queries[2].matches ? 2 : 1
      );
    update();
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return count;
}

function distribute(photos: Photo[], columnCount: number): Item[][] {
  const columns = Array.from({ length: columnCount }, () => ({
    height: 0,
    items: [] as Item[],
  }));
  photos.forEach((photo, index) => {
    const shortest = columns.reduce((a, b) => (a.height <= b.height ? a : b));
    shortest.items.push({ photo, index });
    shortest.height += photo.height / photo.width;
  });
  return columns.map((c) => c.items);
}

export default function Gallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columnCount = useColumnCount();
  const columns = useMemo(
    () => (columnCount ? distribute(photos, columnCount) : []),
    [photos, columnCount]
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parallaxe différentielle des colonnes (3 colonnes et plus)
  useEffect(() => {
    if (!columnCount || columnCount < 3) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = 0;
    let raf = 0;
    const currents = new Array(columnCount).fill(0);

    const onScroll = () => {
      target = window.scrollY;
    };
    const tick = () => {
      for (let i = 0; i < columnCount; i++) {
        const wanted = target * (COLUMN_SPEEDS[i] ?? 0);
        currents[i] += (wanted - currents[i]) * 0.08;
        const el = columnRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(0, ${(-currents[i]).toFixed(2)}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      columnRefs.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
    };
  }, [columnCount]);

  // Révélation au scroll : fondu + translation à l'entrée dans le viewport
  useEffect(() => {
    const items =
      gridRef.current?.querySelectorAll(".reveal:not(.is-visible)") ?? [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [columns]);

  if (photos.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-ink/45">
        Aucune photo pour le moment.
      </p>
    );
  }

  // En attente de la mesure du viewport : réserve l'espace, la cascade
  // de révélation masque le délai.
  if (!columnCount) {
    return <div aria-hidden className="min-h-[150vh]" />;
  }

  return (
    <>
      <div ref={gridRef} className="flex items-start gap-2">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            ref={(el) => {
              columnRefs.current[columnIndex] = el;
            }}
            className="flex min-w-0 flex-1 flex-col gap-2 will-change-transform"
          >
            {column.map(({ photo, index }) => (
              <div
                key={photo.id}
                className="reveal group relative overflow-hidden rounded-md"
                style={{ transitionDelay: `${columnIndex * 80}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-sea"
                  aria-label={`Agrandir la photo ${index + 1}`}
                >
                  <Image
                    src={photo.displayUrl}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    placeholder="blur"
                    blurDataURL={photo.blurDataURL}
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="h-auto w-full transition duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  {/* Voile sobre au survol */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-sea-deep/0 transition duration-300 group-hover:bg-sea-deep/20"
                  />
                </button>

                {/* Numéro de planche, toujours visible */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-3 left-3 font-display text-[0.65rem] font-medium tracking-[0.2em] text-white/85 tabular-nums drop-shadow-[0_1px_4px_rgba(13,47,69,0.6)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Actions : télécharger / imprimer */}
                <div className="absolute right-2.5 bottom-2.5 flex gap-1.5 opacity-0 transition duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
                  <a
                    href={downloadHref(photo.originalUrl)}
                    download
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Télécharger la photo ${index + 1}`}
                    title="Télécharger"
                    className="flex size-8 items-center justify-center rounded-full bg-sea-deep/80 text-white backdrop-blur-sm transition hover:bg-sea-deep"
                  >
                    <DownloadIcon />
                  </a>
                  <button
                    type="button"
                    onClick={() => printPhoto(photo.displayUrl)}
                    aria-label={`Imprimer la photo ${index + 1}`}
                    title="Imprimer"
                    className="flex size-8 items-center justify-center rounded-full bg-sea-deep/80 text-white backdrop-blur-sm transition hover:bg-sea-deep"
                  >
                    <PrintIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onNavigate={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
