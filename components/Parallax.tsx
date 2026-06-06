"use client";

import { useEffect, useRef } from "react";

/**
 * Parallaxe au scroll, avec inertie (lerp) : l'élément dérive doucement
 * vers le haut à `speed` × scrollY. Désactivé si prefers-reduced-motion.
 */
export default function Parallax({
  speed = 0.1,
  className,
  children,
}: {
  speed?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = 0;
    let current = 0;
    let raf = 0;

    function onScroll() {
      target = window.scrollY * speed;
    }
    function tick() {
      current += (target - current) * 0.1;
      if (ref.current) {
        ref.current.style.transform = `translate3d(0, ${(-current).toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
