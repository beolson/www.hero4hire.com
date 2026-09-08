# How-to Guides

Create a how-to guide to help a user who already understands the product complete one specific real-world task. How-tos are task-oriented: they provide the safest, surest route to a successful result. Do not use a how-to to teach concepts or introduce a feature from first principles; link to explanatory or tutorial content when that background is needed.

## Discovery and planning

Before writing, identify:

- The single user goal and the common use case it solves.
- The prerequisite knowledge, access, tools, configuration, and permissions required to finish the task.
- The recommended path, relevant alternate or error scenarios, and the action users should take when they encounter them.
- The expected result that lets a user confirm completion.

Choose the common recommended method when several methods exist. Mention alternatives only when a user needs them to proceed, otherwise link to separate documentation. Keep the task focused and split a large workflow into separate logical how-tos rather than exceeding 8–10 primary steps.

## Repository integration

- Inspect `site/source.config.ts`, `docs/how-to/meta.json`, and the closest existing how-to before writing.
- Add the page under `docs/how-to/` with `title`, `description`, and `type: how-to` frontmatter.
- Add the page slug to `docs/how-to/meta.json` in the intended navigation order.
- Use the [how-to template](templates/how-to.mdx) as the page shape. Preserve existing MDX and Fumadocs conventions.

## Document requirements

Every how-to page must include:

- A task-specific title that begins with a bare-infinitive verb and states the goal, such as `Create a Hero4Hire project`.
- An **Overview** that says what task the guide completes and when or why a user would do it.
- An optional **Before you begin** section for prerequisite knowledge, access, software, setup, or links needed before the task starts. Group prerequisites when that improves clarity, and direct users elsewhere when the guide is not suitable for them.
- One task section containing an ordered list of action-first steps. Orient users before each action, use one action per step, and use conditional imperatives for relevant branches (for example, “If you need X, do Y”).
- An optional **See also** section for limited supporting conceptual, reference, or alternative-procedure links that would otherwise interrupt the flow.

Use plain language and define unavoidable technical terms in context. Add concise explanation only when it helps users act. Include a tested code sample, screenshot, or expected result when it makes a step easier to complete or verify. Use notes, cautions, or warnings to prepare users for important unexpected situations.

## Validation

- Test the instructions end-to-end, or confirm them with a developer or subject-matter expert, before review. Correct omissions, ordering mistakes, and blockers discovered during validation.
- Ensure code samples, screenshots, links, product labels, and expected results are accurate and current.
- Re-test affected how-tos after notable product releases.
- Run the relevant site validation commands after modifying content or navigation, then start `bun dev` from `site/` for user review.
