import { glob } from "astro/loaders"; // Not available with legacy API
import { defineCollection, z } from "astro:content";

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news/" }),
  schema: z.object({
    title: z.string(),
    publish_date: z.date(),
  }),
});

export const collections = { news };
