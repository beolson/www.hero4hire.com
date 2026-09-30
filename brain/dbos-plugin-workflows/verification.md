# Verification record — revised single POC

Checked on 2026-09-29/30 in WSL with Node 24.11.0, npm 11.6.1, Aspire CLI 13.5.4, Podman remote client 6.1.3, Podman machine 6.0.2, and PostgreSQL 18.3. Lockfiles record DBOS 5.2.11, TanStack Start 1.168.59, TanStack Router 1.170.40, React Flow 12.12.0, React 19.3.0, TypeScript 5.9.3, Vite 7.3.6, and `pg` 8.23.0. The TypeScript AppHost uses `vscode-jsonrpc` 8.2.0, compatible with Aspire's generated `vscode-jsonrpc/node.js` import.

## Checks completed

- `npm ci`, `npm run typecheck`, `npm run build`, and `npm test` completed in `pocs/workflow-builder/app/`. The contract tests checked the starter output (Add 12, Subtract 10, Multiply 30), a changed input output (21), and rejection of cycles and unknown operations.
- `npm ci`, `aspire restore`, and `npm run typecheck` completed in `pocs/workflow-builder/apphost/`. The AppHost has `apphost.mts`, no C# project, and one `addViteApp` resource.
- `scripts/start-postgres.sh` started an independent `postgres:18.3` Podman container named `math-workflow-poc-postgres`, listening on loopback port 55433. A direct `pg` query returned `select 1` successfully.
- With `POC_POSTGRES_URL=postgresql://postgres:math-poc-local@127.0.0.1:55433/math_workflows`, `aspire run` started `workflow-studio`. `aspire describe` reported it `Running` and `Healthy` at `http://localhost:45735`. Its server-rendered response included the workflow title and editor panels.
- Chromium inspected the Aspire-hosted page at 1672×941. The top toolbar, Past runs panel, canvas graph, search palette, and selected-node settings were visible. The palette listed exactly Add, Subtract, and Multiply. A screenshot is in [the POC](pocs/workflow-builder/screenshot.png).
- The starter graph ran through the Aspire-hosted Start app and real DBOS/PostgreSQL, showing `Run completed: 30`. A second graph with Add input A set to 5 showed `Run completed: 21`. Save and page reload restored input 5 and three run-history entries at that point, including a prior recovery check. The editor rejected an unknown `divide` operation through markup validation.
- A clean-start browser check confirmed canvas dragging changed Add's stored x position from 25 to about 127.7 without React Flow initialization warnings. Clicking Add in the palette created a fourth node; configuring input A from Multiply's output and input B as literal 2 passed validation and executed with final result 23 against the saved input-5 graph.
- A direct canvas gesture dragged the Multiply output handle onto the new Add node's A handle. The editable definition then contained `{ "kind": "output", "nodeId": "multiply-1" }` for that input.
- `node --import tsx src/lib/verify-recovery.ts` passed against the POC-specific PostgreSQL container. It killed a worker after its first DBOS step checkpoint, launched a new worker, observed output 30 and a reconciled `SUCCEEDED` Past runs record, and did not observe a second invocation of the completed first step. The observed recovered workflow ID was `3d5b88f4-ded2-4271-972d-030abecf622e`.
- A production build served by `npm run start -- --port 3102` returned SSR HTML containing `Math Workflow Studio`, `Past runs`, and `Add two numbers`.

## Incomplete environmental path

The AppHost's default `addPostgres` branch typechecks and was launched with `ASPIRE_CONTAINER_RUNTIME=podman`, but PostgreSQL failed to start. `aspire describe` showed `postgres` and `mathdb` as `FailedToStart` while `workflow-studio` waited. `aspire logs postgres` reported `netavark (exit code 1): nftables error: "nft" did not return successfully while applying ruleset`. This is the same machine-level Podman bridge failure recorded before this revision. The verified external-URI mode uses the POC's host-network Podman PostgreSQL container; it does not demonstrate Aspire owning the database container.

## Practical limits

The crash check occurs after a completed DBOS checkpoint during a durable sleep. It verifies replay of the pure Add step in that case. It does not test interruption between an external side effect and its checkpoint or prove exactly-once delivery to external systems. The POC has no external side-effect adapter. Editing DBOS registration code under Vite HMR can trigger DBOS's register-after-launch error; restart the development process after server-runtime changes. The initial page SSR is independent of PostgreSQL, while draft and history load after hydration.
