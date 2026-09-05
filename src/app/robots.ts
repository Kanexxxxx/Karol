import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/negocio";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/agendar/confirmado", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
