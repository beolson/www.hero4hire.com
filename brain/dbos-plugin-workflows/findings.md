# DBOS workflow builder: findings

**Status:** The approved [single POC](pocs/workflow-builder/README.md) works as a TanStack Start SSR app with DBOS inside its server process, a React Flow workflow editor, and a TypeScript Aspire AppHost. Real PostgreSQL and DBOS runs passed with the AppHost injecting an external PostgreSQL URI. Aspire-managed PostgreSQL remains unverified on this Podman machine because its bridge network cannot start. See the [scope](scope.md), [research](research.md), and [verification record](verification.md).

## Answers

| Scope question | Finding |
| --- | --- |
| Trusted math plugins | Add, Subtract, and Multiply execute in `plugins.server.ts`. Browser-visible metadata describes the installed operations; definitions contain operation IDs, finite number literals, and output references. Server validation rejects unknown operations, missing references, duplicate IDs, and cycles. |
| Durable interpreter | One startup-registered DBOS workflow topologically executes a validated definition snapshot and checkpoints each math node with `DBOS.runStep`. Two browser-authored input sets returned 30 and 21 through real PostgreSQL. A worker killed after the first checkpoint recovered with output 30 without invoking that completed step again. |
| Start SSR and server functions | The route renders the editor in initial HTML. Start server functions handle catalog, validation, draft save/load, execution, and run history; there is no separate API process. PostgreSQL-backed draft and runs reappeared after reload. |
| TypeScript Aspire | `apphost.mts` and `aspire.config.json` typecheck and run the Start app. The verified mode injects a URI for an independently started Podman PostgreSQL container. The AppHost's managed PostgreSQL branch failed at Podman's Netavark bridge setup on this machine. |
| Reference UI | The POC uses a top bar, left Past runs panel, dotted React Flow canvas with a positive-result decision path, zoom/minimap, right searchable palette and selected-node parameters. Users can add nodes, wire output handles, enter hardcoded numbers, save, run, inspect history, and edit/import/export JSON. |

## Recommendation

For this use case, keep the DBOS interpreter and trusted plugin registry inside the TanStack Start server. A [Start server function](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) gives the editor same-origin access to server-only validation and execution. Register one interpreter before [DBOS launch](https://docs.dbos.dev/typescript/reference/dbos-class), and checkpoint each action with [DBOS steps](https://docs.dbos.dev/typescript/reference/workflows-steps). The successful runs and recovery are POC observations; the API behavior is documented in those sources.

Use the POC's [TypeScript Aspire AppHost](pocs/workflow-builder/apphost/apphost.mts) as the local application model. Aspire documents `apphost.mts` and the generated SDK for TypeScript AppHosts in its [AppHost structure guide](https://aspire.dev/app-host/typescript-apphost/). This POC's external-URI mode is a practical workaround for the tested Podman host. Recheck the default Aspire-managed PostgreSQL path on a machine whose container bridge works.

## Limits and next decisions

The result diamond is a fixed `final result > 0` display rule; it is not a user-configurable branching DSL. JSON is the editable interchange format. The interpreter supports acyclic numeric dataflow and a bounded durable pause for recovery testing. It excludes loops, uploaded code, external side effects, production authorization, deployment, and branch-aware validation. The demo's fixed application version is sufficient for this POC; production changes to interpreter steps or plugin behavior need explicit version migration and immutable published definitions, as explained in the [DBOS upgrade guide](https://docs.dbos.dev/typescript/tutorials/upgrading-workflows).

DBOS checkpoints completed steps, but an external effect could occur before its checkpoint is committed. The POC uses pure math operations, so it makes no exactly-once claim for email, payments, or webhooks. A production plugin registry would need receiver idempotency or an equivalent reconciliation design for those actions.
