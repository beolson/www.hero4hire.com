#!/usr/bin/env bash
(
set -euo pipefail

sources_file='/etc/apt/sources.list.d/debian.sources'
backup_file="${sources_file}.nvidia-driver.bak"
script_id='debian-13-x86_64-install-nvidia-driver'
script_version='1.0.0'
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

. /etc/os-release
if [ "${ID:-}" != 'debian' ] || [ "${VERSION_ID:-}" != '13' ]; then
  printf '%s\n' 'Error: this script supports Debian 13 (Trixie) only.' >&2
  exit 1
fi

if [ ! -f "$sources_file" ] || ! grep -Eq '^Suites:.*(^|[[:space:]])trixie(-security|-updates)?([[:space:]]|$)' "$sources_file"; then
  printf 'Error: expected Debian 13 deb822 sources in %s. Configure contrib, non-free, and non-free-firmware manually, then rerun.\n' "$sources_file" >&2
  exit 1
fi

if [ -e "$marker_file" ]; then
  completed_version=$(cat "$marker_file")
  printf 'Error: %s already completed at version %s (current version: %s). Review the host state before deliberately removing %s.\n' "$script_id" "${completed_version:-unknown}" "$script_version" "$marker_file" >&2
  exit 1
fi

cp --archive "$sources_file" "$backup_file"

for component in contrib non-free non-free-firmware; do
  sed -i -E '/^Components:/ { /(^|[[:space:]])'"$component"'([[:space:]]|$)/! s/$/ '"$component"'/ }' "$sources_file"
done

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install --yes "linux-headers-$(uname -r)" nvidia-kernel-dkms nvidia-driver

install -d -m 0755 "$marker_directory"
printf '%s\n' "$script_version" | install -m 0644 /dev/stdin "$marker_file"

printf '%s\n' 'NVIDIA driver packages are installed. Reboot the host, then run nvidia-smi to verify the driver.'
)
