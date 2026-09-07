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

const systemScriptPageSchema = pageSchema.omit({ description: true });

const linuxSystemScriptSchema = systemScriptPageSchema.extend({
  type: z.literal("system-script"),
  os: z.enum([
    "ubuntu",
    "debian",
    "rhel",
    "rocky-linux",
    "alma-linux",
    "amazon-linux",
    "proxmox-ve",
  ]),
  version: z.string().min(1),
  arch: z.enum(["x86_64", "arm64"]),
});

const windowsSystemScriptSchema = systemScriptPageSchema.extend({
  type: z.literal("system-script"),
  os: z.literal("windows-server"),
  version: z.string().min(1),
  arch: z.enum(["x86_64", "arm64"]),
});

export const systemScripts = defineDocs({
  dir: "../docs/systemscripts",
  docs: {
    schema: z.union([linuxSystemScriptSchema, windowsSystemScriptSchema]),
  },
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
