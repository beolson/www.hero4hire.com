# System Scripts

Create a System Script document only after understanding the requested platform and intended result.

## Discovery and research

- Ask for the platform, version, architecture, and what the script must do. Ask follow-up questions when they affect the script's behavior, safety, inputs, or output.
- Research current, authoritative documentation for the selected platform before selecting commands, permissions, or dependencies. Cite those sources in the document.
- If the user provides an SSH host and access context for inspection, connect only to inspect the environment relevant to the request. Do not change the remote host, install software, alter configuration, or create files there.
- Prefer platform-provided tools and existing system utilities. Do not install dependencies unless the requested behavior requires one and the user has authorized it.

## Repository integration

- Inspect `site/source.config.ts` and the closest existing page before writing. The current System Script schema requires `type: system-script`, an allowed `os`, `version`, and `arch`.
- Add the page beneath `docs/systemscripts/<platform>-<version>-<arch>/`, create or update that directory's `meta.json`, and update `docs/systemscripts/meta.json` when introducing a platform directory.
- If the requested platform is not accepted by the schema, extend the schema narrowly for that platform rather than mislabeling the page.
- Reuse `<SystemScript>` for parameterized scripts. Form field names must match `{{placeholder}}` names in the script. Wrap placeholder assignments in single quotes so the component's shell escaping remains effective. Use `type: "password"` for password inputs.

## Document requirements

Use the System Script template. Every page must include:

- A clear **What it does** section that states system impact, prerequisites, and scope such as node-local versus cluster-wide behavior.
- An interactive script form with only the inputs needed to build the script.
- A **How it works** section that explains the important operations, security considerations, and dependency choices.
- A **Commands Used** section in the three-column `Command`, `Argument`, `Description` table format. Use a blank command cell for each argument row and the `command-reference-table` wrapper so the table has visible borders.
- A **References** section with direct links to the authoritative sources used for platform-specific decisions.

Validate the generated script syntax where practical without executing a mutating script on a target system. Run the site validation commands after modifying content or its supporting integration.
