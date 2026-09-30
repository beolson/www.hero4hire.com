# Source investigation and POC approach

Updated 2026-09-29 for the approved single-app scope. Previous research assumed a separate DBOS API and a .NET Aspire AppHost; those assumptions are superseded.

| Question | Primary source | Documented fact and POC choice |
| --- | --- | --- |
| TanStack Start SSR and server functions | [Build from scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch), [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) | Start renders the route on the server and provides same-origin server functions. The POC hosts validation, save, execution, and history in these functions. |
| TypeScript Aspire AppHost | [TypeScript AppHost structure](https://aspire.dev/app-host/typescript-apphost/), [AppHost overview](https://aspire.dev/get-started/app-host/) | Current scaffolds use `apphost.mts`, `aspire.config.json`, and a generated TypeScript SDK. `addViteApp` hosts the Start app; the POC has no C# AppHost. |
| PostgreSQL connection | [Aspire PostgreSQL connection properties](https://aspire.dev/integrations/databases/postgres/postgres-connect/), [PostgreSQL hosting](https://aspire.dev/integrations/databases/postgres/postgres-host/) | Database references expose a PostgreSQL `*_URI` value to TypeScript apps. The POC reads `MATHDB_URI`; a tested external-URI mode injects `DBOS_SYSTEM_DATABASE_URL`. |
| DBOS workflow and steps | [Workflow tutorial](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial), [workflow/step reference](https://docs.dbos.dev/typescript/reference/workflows-steps), [lifecycle](https://docs.dbos.dev/typescript/reference/dbos-class) | Register the interpreter before `DBOS.launch`; use one checkpointed `runStep` per installed math operation. A validated definition snapshot is the workflow argument. |
| Durable recovery and status | [DBOS methods](https://docs.dbos.dev/typescript/reference/methods), [management](https://docs.dbos.dev/typescript/tutorials/workflow-management) | `DBOS.sleep` is durable, and `retrieveWorkflow`/`getWorkflowStatus` can reconcile a run after restart. The POC tests a killed worker after its first checkpoint. |
| React Flow canvas | [React Flow overview](https://reactflow.dev/learn), [handles](https://reactflow.dev/learn/customization/handles) | Custom node handles represent numeric inputs and outputs. The editor maps edges to typed definition references. |
| Podman compatibility | [Aspire container networking](https://aspire.dev/fundamentals/container-networking/), [Aspire prerequisites](https://aspire.dev/get-started/prerequisites/) | Aspire creates a container bridge for managed resources. The tested Podman machine fails that bridge at Netavark nftables setup, so the verified mode uses a host-network PostgreSQL container and an injected URI. |

## Implementation choice

A fixed interpreter is registered once. Only trusted Add, Subtract, and Multiply implementations live in `plugins.server.ts`; the browser receives plugin metadata and sends definition data. Zod checks node IDs, finite numeric literals, known operations, source existence, and acyclic references before DBOS execution. Node order is topological, and each execution receives a complete definition snapshot. JSON is the POC's editable interchange format.

The visual branch is based on whether the final result is greater than zero. It is intentionally fixed because the approved example controls are the three math operations. A production builder would need a separately specified decision model and branch-aware type checking.
