# DBOS workflow builder research scope

Approved by the user on 2026-09-29. This revision supersedes the earlier .NET Aspire and separate-API plan. The user explicitly approved this combined POC after clarifying that DBOS belongs in the TanStack Start app and that the example nodes are Add, Subtract, and Multiply.

## Decision and audience

Evaluate whether a single TanStack Start SSR application can host a visual workflow editor and execute user-authored, plugin-backed workflows durably with DBOS. Findings are for the developer choosing the app architecture and local development stack.

## Stack and layout

- One independently runnable POC in `pocs/workflow-builder/`. Its TanStack Start app owns both the React UI and all DBOS workflow registration, validation, execution, and run history through server-side code/server functions. There is no separate API service.
- A TypeScript Aspire AppHost (`apphost.mts`, not a C# project) orchestrates the TanStack Start app and PostgreSQL. It may live inside the same POC or beside the app within that one POC.
- React Flow implements the visual canvas. The reference image guides the layout: top bar with workflow title and save/run actions; past runs on the left; a dotted central canvas with connected nodes, a conditional path, zoom controls and minimap; searchable node palette and selected-node parameter panel on the right. The POC should resemble the structure and interaction of the image, not reproduce its branding or unrelated example actions.
- The visible example plugin controls are Add, Subtract, and Multiply. A node input can use a hardcoded number or the output of another node. The initial sample workflow demonstrates all three operations.
- Real PostgreSQL and the current stable DBOS TypeScript SDK; Node/TypeScript version, exact package versions, and Aspire CLI version are recorded. Podman is the intended container runtime.
- Local execution only, with no paid services or production deployment.

## Questions and success criteria

1. How can trusted, installed math plugins expose typed inputs and outputs to both the editor and DBOS execution while keeping plugin code server-side?
2. Can a fixed, startup-registered DBOS interpreter execute validated user-authored workflow definitions, including values from earlier nodes, with safe replay and recovery?
3. Can TanStack Start perform SSR for the initial editor page and use its own server functions for catalog, validation, save, run, and history, with no separate backend?
4. Can a TypeScript Aspire AppHost start the app and provide PostgreSQL connection configuration?
5. Does the single POC visibly support editing, connecting, validating, saving, running, and inspecting the math workflow? Verify at least two input sets or graph variants through real DBOS and PostgreSQL.

## Runtime verification

Install dependencies, build and typecheck the app and AppHost, start real PostgreSQL, run through Aspire where the environment permits, and exercise the UI and server functions. Check that the initial HTML is server-rendered, the palette contains exactly the three example math operations, typed connections and hardcoded values work, invalid definitions are rejected, and run results/history are observable. Exercise DBOS checkpoint/recovery where the available runtime permits and distinguish observed durability from any untested exactly-once claims. Record commands and actual outcomes in `verification.md`.

## Limits

Trusted plugins are installed server-side; user definitions contain data, not executable code. Exclude uploaded code, arbitrary expressions, loops, production authentication, and production deployment. Keep implementation and dependencies inside this topic. Historical findings and verification from the earlier plan are not evidence that this revised POC passed; update them to distinguish prior results from new observations.
