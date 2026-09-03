import type { MetadataRoute } from "next";

const BASE = "https://karolcarvalho.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return [
    { url: BASE, lastModified: agora, changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/agendar`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
  ];
}
