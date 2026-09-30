#!/usr/bin/env bash
set -euo pipefail

# Host networking works around Podman bridge/Netavark failures on the target WSL machine.
# The database listens only on loopback inside that machine.
if podman container exists math-workflow-poc-postgres; then
  podman start math-workflow-poc-postgres
else
  podman run -d --name math-workflow-poc-postgres --network host \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=math-poc-local \
    -e POSTGRES_DB=math_workflows \
    -v math-workflow-poc-data:/var/lib/postgresql \
    docker.io/library/postgres:18.3 \
    -c port=55433 -c listen_addresses=127.0.0.1
fi
printf 'PostgreSQL URL: postgresql://postgres:math-poc-local@127.0.0.1:55433/math_workflows\n'
