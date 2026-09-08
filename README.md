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

## Deployment

GitHub Actions builds the static export and uploads it to the existing Cloudflare Pages project, `hero4hire`:

- Pushes to `main` (including merged pull requests) publish the production deployment for `hero4hire.com` and `www.hero4hire.com`.

Before the first workflow run, add these repository Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID that owns the `hero4hire` Pages project.
- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with **Account → Cloudflare Pages → Edit** permission, scoped to that account.
