# Hero4Hire documentation site

The static documentation site is a Next.js application in [`site/`](site/). Its content is intentionally kept at the repository root:

- [`docs/`](docs/) contains hierarchical Fumadocs documentation and `meta.json` navigation.
- [`blog/`](blog/) contains flat MDX blog posts.

## Requirements

Use Bun 1.3 or newer.

## Development

```bash
cd site
bun install
bun run dev
```

Open `http://localhost:3000`. Production files are generated as a fully static site in `site/out/`:

```bash
bun run check
bun run typecheck
bun run build
```

The Bun-powered Next.js development server uses Turbopack and is configured with the repository root as its workspace boundary, so changes under both `docs/` and `blog/` are available during local development.

## Writing content

Documentation pages use standard Fumadocs MDX frontmatter (`title` and optional `description`) and can be grouped into folders. Update the nearest `meta.json` to control their sidebar order and labels.

Blog posts live directly in `blog/` and require `title`, `description`, `author`, and an ISO `date` (`YYYY-MM-DD`).

## Code quality

Biome handles both linting and formatting:

```bash
cd site
bun run lint
bun run format:check
bun run format
```

`bun run check` runs Biome's combined lint and formatting validation. Run `bun run format` to apply Biome's formatting fixes.
