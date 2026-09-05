import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "../docs",
  docs: { schema: pageSchema },
  meta: { schema: metaSchema },
});

export const blogPosts = defineCollections({
  type: "doc",
  dir: "../blog",
  schema: pageSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
  }),
});

export default defineConfig({});
