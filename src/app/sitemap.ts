import type { MetadataRoute } from "next";
import { ALL_TOPICS } from "@content/roadmap";
import { SITE_URL } from "@/lib/links";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = [
    { url: `${SITE_URL}/`, priority: 1, changeFrequency: "weekly" as const },
    { url: `${SITE_URL}/roadmap/`, priority: 0.9, changeFrequency: "weekly" as const },
    { url: `${SITE_URL}/apoie/`, priority: 0.5, changeFrequency: "monthly" as const },
  ];
  const topicos = ALL_TOPICS.map((t) => ({
    url: `${SITE_URL}/topico/${t.slug}/`,
    priority: t.status === "ready" ? 0.8 : 0.4,
    changeFrequency: "monthly" as const,
  }));
  return [...base, ...topicos];
}
