import { glob } from "astro/loaders"; // Not available with legacy API
import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles/" }),
  schema: z.object({
    title: z.string(),
    publish_date: z.date(),
    description: z.string(),
    slug: z.string(),
  }),
});

export const collections = { articles };
