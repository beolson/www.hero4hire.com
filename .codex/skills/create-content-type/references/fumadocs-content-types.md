# Fumadocs content-type conventions

## Source and schemas

- `site/source.config.ts` defines Fumadocs collections and their Zod frontmatter schemas.
- The primary `docs` collection scans `docs/` and is served at `/docs` through `site/lib/source.ts`.
- Blog collections are served separately at `/blog`. Keep a new content type in the source that matches its intended public route.
- A type-specific collection can validate a subtree while the primary docs collection continues to provide the unified documentation route tree. Avoid removing an existing source from the loader unless the requested navigation or routing behavior requires it.

## Navigation and examples

- `docs/meta.json` determines the ordered root navigation. Add a new top-level docs folder there when it should appear in the left navigation.
- Each navigable subdirectory needs a `meta.json` with a title and ordered `pages` list. Use `defaultOpen` only when the hierarchy should be expanded initially.
- Organize example files according to the intended navigation hierarchy, not merely to mirror metadata fields.
- Include one safe example by default. It should demonstrate the required frontmatter and rendering behavior without altering a target system or external state.

## MDX behavior

- Register custom components in `site/components/mdx.tsx` so compiled documentation can resolve them.
- Place interactive components in `site/components/` with a top-level `"use client"` directive. Their MDX props must be serializable.
- Prefer existing Fumadocs MDX components and repository UI primitives before creating new UI.

## Current reference: System Scripts

System Scripts demonstrate a specialized docs subtree with a strict frontmatter schema, `meta.json` hierarchy, an interactive client-side MDX component, and a representative example. Their schema and behavior are specific to scripts; reuse the integration pattern, not the exact fields or UI.

## Validation

Run `bun run typecheck` from `site/` after source, schema, MDX, or component changes. Also run the relevant Biome check and verify the generated route and left navigation when navigation changes.
