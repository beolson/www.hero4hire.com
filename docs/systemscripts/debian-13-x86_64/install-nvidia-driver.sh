#!/usr/bin/env bash
(
  set -euo pipefail

  sources_files=()
  legacy_source_pattern='^[[:space:]]*deb(-src)?[[:space:]]+([[][^]]*[]][[:space:]]+)?[^[:space:]]+[[:space:]]+trixie(-security|-updates)?[[:space:]]+'
  script_id='debian-13-x86_64-install-nvidia-driver'
  script_version='1.1.0'
  marker_directory='/var/lib/hero4hire/system-scripts'
  marker_file="$marker_directory/$script_id.version"

  if [ "$(id -u)" -ne 0 ]; then
    printf '%s\n' 'Error: run this script as root.' >&2
    exit 1
  fi

  if [ "$(uname -m)" != 'x86_64' ]; then
    printf '%s\n' 'Error: this script supports x86_64 systems only.' >&2
    exit 1
  fi

  if [ ! -r /etc/os-release ]; then
    printf '%s\n' 'Error: /etc/os-release is required to identify Debian 13.' >&2
    exit 1
  fi

  # Read OS metadata from the target host, not the linting machine.
  # shellcheck source=/dev/null
  . /etc/os-release
  if [ "${ID:-}" != 'debian' ] || [ "${VERSION_ID:-}" != '13' ]; then
    printf '%s\n' 'Error: this script supports Debian 13 (Trixie) only.' >&2
    exit 1
  fi

  if [ -f /etc/apt/sources.list.d/debian.sources ] && grep -Eq '^Suites:.*(^|[[:space:]])trixie(-security|-updates)?([[:space:]]|$)' /etc/apt/sources.list.d/debian.sources; then
    sources_files+=(/etc/apt/sources.list.d/debian.sources)
  fi
  if [ -f /etc/apt/sources.list ] && grep -Eq "$legacy_source_pattern" /etc/apt/sources.list; then
    sources_files+=(/etc/apt/sources.list)
  fi
  if [ "${#sources_files[@]}" -eq 0 ]; then
    printf '%s\n' 'Error: expected active Trixie sources in /etc/apt/sources.list or /etc/apt/sources.list.d/debian.sources. Configure contrib, non-free, and non-free-firmware manually for a custom source layout.' >&2
    exit 1
  fi

  if [ -e "$marker_file" ]; then
    completed_version=$(cat "$marker_file")
    printf 'Error: %s already completed at version %s (current version: %s). Review the host state before deliberately removing %s.\n' "$script_id" "${completed_version:-unknown}" "$script_version" "$marker_file" >&2
    exit 1
  fi

  for sources_file in "${sources_files[@]}"; do
    backup_file="${sources_file}.nvidia-driver.bak"
    cp --archive "$sources_file" "$backup_file"
    if [[ "$sources_file" == *.sources ]]; then
      for component in contrib non-free non-free-firmware; do
        sed -i -E '/^Components:/ { /(^|[[:space:]])'"$component"'([[:space:]]|$)/! s/$/ '"$component"'/ }' "$sources_file"
      done
    else
      temporary_file=$(mktemp)
      trap 'rm -f "$temporary_file"' EXIT
      awk -v source_pattern="$legacy_source_pattern" '
      {
        line = $0
        comment = ""
        comment_start = index(line, "#")
        if (comment_start) {
          comment = substr(line, comment_start)
          line = substr(line, 1, comment_start - 1)
        }
        if (line ~ source_pattern) {
          split("contrib non-free non-free-firmware", components, " ")
          for (i = 1; i <= 3; i++) {
            if (line !~ "(^|[[:space:]])" components[i] "([[:space:]]|$)") {
              sub(/[[:space:]]*$/, "", line)
              line = line " " components[i]
            }
          }
          if (comment != "") sub(/[[:space:]]*$/, "", line)
          print line (comment == "" ? "" : " " comment)
        } else {
          print $0
        }
      }
    ' "$sources_file" >"$temporary_file"
      cat "$temporary_file" >"$sources_file"
      rm -f "$temporary_file"
      trap - EXIT
    fi
  done

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install --yes "linux-headers-$(uname -r)" nvidia-kernel-dkms nvidia-driver

  install -d -m 0755 "$marker_directory"
  printf '%s\n' "$script_version" | install -m 0644 /dev/stdin "$marker_file"

  printf '%s\n' 'NVIDIA driver packages are installed. Reboot the host, then run nvidia-smi to verify the driver.'
)
