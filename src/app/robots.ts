import type { MetadataRoute } from "next";

const BASE = "https://karolcarvalho.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/agendar/confirmado", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
