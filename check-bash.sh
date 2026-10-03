#!/usr/bin/env bash
set -euo pipefail

if (($# != 0)); then
  printf 'Usage: %s\nChecks Bash syntax, ShellCheck lint, and shfmt formatting without modifying files.\n' "${0##*/}" >&2
  exit 2
fi

project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
cd -- "$project_root"

for tool in git shellcheck shfmt; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing required tool: %s. Install it and rerun this script.\n' "$tool" >&2
    exit 2
  fi
done

# Include tracked and new scripts, excluding ignored dependencies/build output.
# NUL delimiters preserve filenames containing spaces or other special characters.
script_list=$(mktemp)
trap 'rm -f -- "$script_list"' EXIT
git ls-files --cached --others --exclude-standard --deduplicate -z -- '*.sh' >"$script_list"
scripts=()
while IFS= read -r -d '' script; do
  # A tracked file may have been deleted in the working tree.
  if [[ -f $script ]]; then
    scripts+=("$script")
  fi
done <"$script_list"

if ((${#scripts[@]} == 0)); then
  printf 'No Bash scripts found.\n'
  exit 0
fi

status=0
printf 'Checking Bash syntax for %s scripts...\n' "${#scripts[@]}"
for script in "${scripts[@]}"; do
  if ! bash -n -- "$script"; then
    status=1
  fi
done

printf '\nRunning ShellCheck...\n'
if ! shellcheck --shell=bash -- "${scripts[@]}"; then
  status=1
fi

printf '\nChecking shfmt formatting (2-space indentation)...\n'
if ! shfmt -d -i 2 -ci -- "${scripts[@]}"; then
  status=1
fi

if ((status == 0)); then
  printf '\nAll Bash checks passed.\n'
else
  printf '\nBash checks failed; review the diagnostics above.\n' >&2
fi
exit "$status"
