---
name: create-content-type
description: Create or evolve Fumadocs documentation and blog content types in this repository, including typed metadata, navigation, MDX components, and examples.
---

# Create Content Type

Create a project-appropriate Fumadocs content type without changing unrelated content behavior.

## Workflow

1. Inspect the current content collections, source loaders, navigation metadata, MDX component registry, and the closest existing content type. Treat those files as the source of truth.
2. Clarify only product choices that cannot be discovered: the content's audience and purpose, required metadata, navigation hierarchy, whether it needs interaction, and whether an example is out of scope.
3. Define the smallest schema and source integration that preserves existing documentation and blog routes. Keep type-specific validation separate from generic content routing when both are needed.
4. Add or update navigation through `meta.json` files. Put a safe, representative example in the requested content hierarchy unless the user excludes it.
5. Add MDX components only for behavior that Markdown and existing Fumadocs components cannot provide. Client components must receive serializable props and be registered in the shared MDX component map.
6. Validate generated sources and TypeScript with the site’s Bun commands. Check the resulting route and left navigation when the change affects either.

## Project conventions

Read [the Fumadocs content-type reference](references/fumadocs-content-types.md) before changing collection, source, navigation, or MDX-component wiring.

Do not apply System Script-specific requirements—such as its target metadata, parameter substitution, or command reference format—to another content type unless the user asks for them.
