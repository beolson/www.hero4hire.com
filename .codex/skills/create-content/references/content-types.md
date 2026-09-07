# Future Content Types

When a request introduces a document type not covered by this skill:

- Read the existing [Create Content Type skill](../../create-content-type/SKILL.md) and its linked Fumadocs reference before changing schemas, navigation, routes, or MDX components.
- Add one focused reference at `references/<content-type>.md` that describes the type's discovery, writing, validation, and integration requirements.
- Add its reusable template at `references/templates/<content-type>.mdx` when the type has a stable page shape.
- Add links to both resources in `SKILL.md`; keep the entrypoint as a router rather than duplicating the type-specific process.
