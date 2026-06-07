import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lemer Pax x Sofra 2026",
  description: "Galerie photo privée.",
  // Galerie privée : aucune indexation, sur toutes les pages
  // (doublé par app/robots.ts et le header X-Robots-Tag dans next.config.ts).
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${newsreader.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
