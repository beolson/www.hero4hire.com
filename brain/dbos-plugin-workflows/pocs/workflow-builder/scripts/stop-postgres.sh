#!/usr/bin/env bash
set -euo pipefail
podman stop math-workflow-poc-postgres
printf 'Data remains in volume math-workflow-poc-data.\n'
