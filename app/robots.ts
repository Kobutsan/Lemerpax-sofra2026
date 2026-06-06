import type { MetadataRoute } from "next";

// Galerie privée : tout est interdit aux robots. Aucun sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
