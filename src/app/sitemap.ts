import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/negocio";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: SITE_URL, lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/agendar`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.2 },
  ];
}
