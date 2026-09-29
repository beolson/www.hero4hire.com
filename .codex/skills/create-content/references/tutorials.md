# Tutorials

Create a tutorial series to help learners gain practical skills through a deliberate, hands-on path. Tutorials are learning-oriented and are not a substitute for task-oriented how-to guides. A tutorial series has one topic folder under `docs/tutorial/`, an overview page, ordered learning steps, and a single cheat sheet as its final page.

## Discovery and approval

Before researching or drafting, work with the user to define:

- The intended audience, their starting knowledge, and the required prerequisites.
- The topic boundary and the skills learners should be able to demonstrate after completing the series.
- The number and sequence of hands-on steps needed to teach those skills.

Research the topic closely with current, authoritative primary sources, such as official product documentation, specifications, or maintainers' guidance. Check version-specific instructions, prerequisites, commands, and expected results. Use the research to propose the series title, learning objectives, prerequisite list, and an ordered outline whose individual learning steps target 30 to 40 minutes.

Present that researched outline to the user and wait for approval before drafting tutorial pages. Do not invent an unverified procedure or silently choose a consequential learning scope.

## Repository integration

- Inspect `site/source.config.ts`, `docs/tutorial/meta.json`, and the closest tutorial series before writing.
- Create `docs/tutorial/<topic>/` with a `meta.json` that orders `index` first, every step next, and `cheat-sheet` last.
- Give every page `title`, `description`, and `type: tutorial` frontmatter.
- Use the series overview, tutorial-step, and cheat-sheet templates. Keep the overview, each step, and the cheat sheet in the same topic folder.
- Add the topic folder to `docs/tutorial/meta.json` in the intended navigation order.

## Writing requirements

- The overview must state the learner audience, prerequisites, skills to be learned, step sequence, and key authoritative resources.
- Each ordered step must have a clear learning outcome and hands-on actions that take approximately 30 to 40 minutes. Use action-first instructions, explain important concepts in context, and include tested commands, code samples, screenshots, or expected results when they help learners proceed.
- Keep the path deliberate: minimize branching and unexpected scenarios so learners can finish successfully. Link to separate how-tos or reference material instead of expanding the series beyond its learning goal.
- The final cheat sheet must concisely collect reusable commands, options, concepts, and key resource links covered by the series.
- Link authoritative sources where they help learners prepare, verify a concept, or continue learning.

## Validation

- Test the tutorial instructions end-to-end where practical, or confirm them with a subject-matter expert. Recheck source versions and links before review.
- Run the relevant site validation commands after modifying content or navigation, then start `bun dev` from `site/` for user review.
