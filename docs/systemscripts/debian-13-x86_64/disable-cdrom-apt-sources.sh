#!/usr/bin/env bash
(
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    printf '%s\n' 'Error: sudo is required to update APT source configuration.' >&2
    exit 1
  fi
  sudo -v
fi

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

if [ "$(uname -m)" != 'x86_64' ] || [ ! -r /etc/os-release ]; then
  printf '%s\n' 'Error: this script supports Debian 13 x86_64 only.' >&2
  exit 1
fi

. /etc/os-release
if [ "$ID" != 'debian' ] || [ "$VERSION_ID" != '13' ]; then
  printf '%s\n' 'Error: this script supports Debian 13 (Trixie) only.' >&2
  exit 1
fi

shopt -s nullglob
source_files=(
  /etc/apt/sources.list
  /etc/apt/sources.list.d/*.list
  /etc/apt/sources.list.d/*.sources
)
changed_count=0
backup_timestamp="$(date -u +%Y%m%dT%H%M%SZ)"

for source_file in "${source_files[@]}"; do
  [ -f "$source_file" ] || continue
  staging_file="$(mktemp)"

  case "$source_file" in
    *.sources)
      as_root awk '
        function emit_stanza(    i, has_cdrom_uri, has_enabled) {
          if (line_count == 0) return

          has_cdrom_uri = 0
          for (i = 1; i <= line_count; i++) {
            if (lines[i] ~ /^URIs:[[:space:]]*cdrom:[^[:space:]]+[[:space:]]*$/) {
              has_cdrom_uri = 1
            }
          }

          if (has_cdrom_uri) {
            has_enabled = 0
            for (i = 1; i <= line_count; i++) {
              if (lines[i] ~ /^Enabled:/) {
                print "Enabled: no"
                has_enabled = 1
              } else {
                print lines[i]
              }
            }
            if (!has_enabled) print "Enabled: no"
          } else {
            for (i = 1; i <= line_count; i++) print lines[i]
          }
        }

        /^[[:space:]]*$/ {
          emit_stanza()
          print
          delete lines
          line_count = 0
          next
        }

        { lines[++line_count] = $0 }

        END { emit_stanza() }
      ' "$source_file" > "$staging_file"
      ;;
    *)
      as_root sed -E \
        '/^[[:space:]]*(deb|deb-src)([[:space:]]+\\[[^]]+\\])?[[:space:]]+cdrom:/ s/^/# /' \
        "$source_file" > "$staging_file"
      ;;
  esac

  if ! cmp -s "$source_file" "$staging_file"; then
    backup_file="$(dirname "$source_file")/.$(basename "$source_file").cdrom-disabled.$backup_timestamp.bak"
    as_root cp --archive "$source_file" "$backup_file"
    source_mode="$(as_root stat -c '%a' "$source_file")"
    as_root install -m "$source_mode" "$staging_file" "$source_file"
    printf 'Disabled CD-ROM APT source entries in %s (backup: %s)\n' "$source_file" "$backup_file"
    changed_count=$((changed_count + 1))
  fi

  rm -f "$staging_file"
done

if [ "$changed_count" -eq 0 ]; then
  printf '%s\n' 'No active CD-ROM APT sources were found.'
else
  printf 'Disabled CD-ROM APT sources in %s file(s).\n' "$changed_count"
fi

as_root apt-get update
)
