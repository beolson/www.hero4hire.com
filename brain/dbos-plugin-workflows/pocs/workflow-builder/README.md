# Math Workflow Studio POC

One TanStack Start SSR application hosts both the React Flow editor and the DBOS workflow runtime. The only companion service is PostgreSQL. A TypeScript Aspire AppHost is in `apphost/`; there is no API service.

![Workflow editor with three math nodes and a result branch](screenshot.png)

## Requirements

- Node.js 24.x (tested 24.11.0), npm 11.x, Aspire CLI 13.5.4, Podman and the `postgres:18.3` image.
- The sample PostgreSQL password below is a public local fixture. Do not reuse it outside this POC.
- On this WSL Podman machine, the verified setup uses host networking because Podman's bridge network fails while applying Netavark nftables rules.

## Run the verified setup

From this directory:

```bash
./scripts/start-postgres.sh
cd app && npm ci && cd ..
cd apphost
npm ci
aspire restore
POC_POSTGRES_URL=postgresql://postgres:math-poc-local@127.0.0.1:55433/math_workflows aspire run
```

Open the `workflow-studio` URL shown by `aspire describe` or the Aspire dashboard. The app should show Add, Subtract, and Multiply on a three-panel canvas. The starter graph computes `(8 + 4 - 2) × 3 = 30`; changing Add input A to 5 computes 21. Save persists the definition, and Past runs loads after the page hydrates.

`apphost/apphost.mts` also has a default Aspire-managed PostgreSQL branch: omit `POC_POSTGRES_URL` to use it. That branch typechecks but could not start on the tested Podman machine because its bridge network fails. It needs a working container bridge. The verified external-URI branch still runs the TanStack Start process and injects its PostgreSQL URL through the TypeScript AppHost.

To run the app directly against the POC database:

```bash
cd app
npm run dev
```

The direct app listens on `http://localhost:3100`. Server-only DBOS code runs inside the Start process. Restart the dev server after editing `runtime.server.ts` or `plugins.server.ts`: DBOS registers workflows once per process, before launch, while Vite may reload server modules during development.

## Verify

```bash
cd app
npm run typecheck
npm run build
npm test
node --import tsx src/lib/verify-recovery.ts
```

Run the recovery check with PostgreSQL started and no other POC app process using the same local DBOS executor. It starts a workflow with a durable pause after Add, kills its process after the first step checkpoint, starts a new process, and confirms the completed first step was not invoked again. The expected output is `RECOVERY_VERIFIED <workflow-id>`.

The UI supports palette click or drag, connecting an output to input A or B, hardcoded numbers, node position dragging, JSON import/export, validation, save, run, and run history. The result diamond routes the final number to a positive or non-positive outcome. The decision is a fixed display rule, not another plugin.

## Cleanup

Stop Aspire with Ctrl+C. Run `./scripts/stop-postgres.sh` to stop the database. Its `math-workflow-poc-data` volume remains for later runs; remove that volume explicitly only if you want to discard POC data.
