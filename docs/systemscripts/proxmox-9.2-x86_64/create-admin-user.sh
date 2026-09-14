#!/usr/bin/env bash
(
set -euo pipefail

account_name='{{account_name}}'
account_password='{{account_password}}'
github_user='{{github_user}}'
keys_file=''

for parameter in account_name account_password github_user; do
  placeholder="{{${parameter}}}"
  if [ "${!parameter}" = "$placeholder" ]; then
    printf -v "$parameter" '%s' ''
  fi
done

while [ "$#" -gt 0 ]; do
  case "$1" in
    --account-name | --github-user)
      [ "$#" -ge 2 ] || {
        printf 'Error: %s requires a value.\n' "$1" >&2
        exit 1
      }
      case "$1" in
        --account-name) account_name="$2" ;;
        --github-user) github_user="$2" ;;
      esac
      shift 2
      ;;
    *)
      printf 'Error: unknown argument: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$account_password" ]; then
  read -r -s -p 'Enter account password: ' account_password
  printf '\n'
fi

pve_user="${account_name}@pve"

cleanup() {
  if [ -n "$keys_file" ]; then
    rm -f "$keys_file"
  fi
}
trap cleanup EXIT

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' 'Error: run this script as root.' >&2
  exit 1
fi

if ! command -v pveum >/dev/null 2>&1; then
  printf '%s\n' 'Error: pveum was not found; this must run on Proxmox VE.' >&2
  exit 1
fi

if ! [[ "$account_name" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
  printf '%s\n' 'Error: account name must be 1–32 lowercase letters, digits, underscores, or hyphens, and cannot start with a digit or hyphen.' >&2
  exit 1
fi

if [ -z "$account_password" ] || [[ "$account_password" == *$'\n'* ]]; then
  printf '%s\n' 'Error: password must not be empty or contain a newline.' >&2
  exit 1
fi

if [ -n "$github_user" ] && ! [[ "$github_user" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$ ]]; then
  printf '%s\n' 'Error: GitHub user name is invalid.' >&2
  exit 1
fi

if id "$account_name" >/dev/null 2>&1; then
  printf 'Error: local account %s already exists.\n' "$account_name" >&2
  exit 1
fi

if pveum user list | awk 'NR > 1 { print $1 }' | grep -Fx "$pve_user" >/dev/null; then
  printf 'Error: Proxmox account %s already exists.\n' "$pve_user" >&2
  exit 1
fi

if [ -n "$github_user" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    printf '%s\n' 'Error: curl is required only when importing GitHub SSH keys.' >&2
    exit 1
  fi

  keys_file=$(mktemp)
  curl --fail --location --silent --show-error "https://github.com/$github_user.keys" > "$keys_file"
  if [ ! -s "$keys_file" ]; then
    printf 'Error: GitHub user %s has no public SSH keys.\n' "$github_user" >&2
    exit 1
  fi
fi

useradd --create-home --shell /bin/bash "$account_name"
printf '%s:%s\n' "$account_name" "$account_password" | chpasswd

if [ -n "$github_user" ]; then
  install -d -m 700 -o "$account_name" -g "$account_name" "/home/$account_name/.ssh"
  install -m 600 -o "$account_name" -g "$account_name" "$keys_file" "/home/$account_name/.ssh/authorized_keys"
fi

pveum user add "$pve_user" --password "$account_password"
pveum acl modify / --user "$pve_user" --role PVEAdmin

printf 'Created local account %s and Proxmox administrator %s.\n' "$account_name" "$pve_user"
)
