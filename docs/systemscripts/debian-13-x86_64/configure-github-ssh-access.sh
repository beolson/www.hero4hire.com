#!/usr/bin/env bash
(
set -euo pipefail

github_username='{{github_username}}'

if [ "$github_username" = '{{github_username}}' ]; then
  github_username=''
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --github-username)
      [ "$#" -ge 2 ] || {
        printf '%s\n' 'Error: --github-username requires a value.' >&2
        exit 1
      }
      github_username="$2"
      shift 2
      ;;
    *)
      printf 'Error: unknown argument: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [ "$(id -u)" -eq 0 ]; then
  target_user="${SUDO_USER:-}"
  if [ -z "$target_user" ] || [ "$target_user" = 'root' ]; then
    printf '%s\n' 'Error: run this directly from the non-root account to configure, not from a root shell.' >&2
    exit 1
  fi
else
  target_user="$(id -un)"
  if ! command -v sudo >/dev/null 2>&1; then
    printf '%s\n' 'Error: sudo is required to configure SSH and the systemd timer.' >&2
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

if [ "$target_user" = 'root' ]; then
  printf '%s\n' 'Error: root cannot be the target account.' >&2
  exit 1
fi

if ! printf '%s' "$target_user" | grep -Eq '^[a-z_][a-z0-9_-]*[$]?$'; then
  printf '%s\n' 'Error: the sudo-invoking username is not safe for this script.' >&2
  exit 1
fi

if ! printf '%s' "$github_username" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$|^[A-Za-z0-9]$'; then
  printf '%s\n' 'Error: enter a valid GitHub username.' >&2
  exit 1
fi

if [ "$(uname -m)" != 'x86_64' ] || [ ! -r /etc/os-release ]; then
  printf '%s\n' 'Error: this script supports Debian 13 x86_64 only.' >&2
  exit 1
fi

. /etc/os-release
if [ "${ID:-}" != 'debian' ] || [ "${VERSION_ID:-}" != '13' ]; then
  printf '%s\n' 'Error: this script supports Debian 13 (Trixie) only.' >&2
  exit 1
fi

target_home="$(getent passwd "$target_user" | cut -d: -f6)"
target_group="$(id -gn "$target_user")"
if [ -z "$target_home" ] || [ ! -d "$target_home" ]; then
  printf '%s\n' 'Error: unable to find a usable home directory for the sudo-invoking user.' >&2
  exit 1
fi

if [ ! -x /usr/sbin/sshd ]; then
  printf '%s\n' 'Error: openssh-server is required; install it with: sudo apt-get install openssh-server' >&2
  exit 1
fi

if ! as_root systemctl cat ssh.service >/dev/null 2>&1; then
  printf '%s\n' 'Error: ssh.service is required. Verify that openssh-server is installed and systemd is the active init system.' >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
if ! command -v curl >/dev/null 2>&1; then
  as_root apt-get update
  as_root apt-get install --yes curl
fi

as_root install -d -m 0755 /etc/github-ssh-key-sync /usr/local/libexec
as_root install -d -m 0700 -o "$target_user" -g "$target_group" "$target_home/.ssh"

sync_config="/etc/github-ssh-key-sync/$target_user.conf"
sync_helper='/usr/local/libexec/github-ssh-key-sync'
service_name="github-ssh-key-sync-$target_user.service"
timer_name="github-ssh-key-sync-$target_user.timer"

as_root install -m 0644 /dev/stdin "$sync_config" <<EOF
target_user='$target_user'
target_home='$target_home'
github_username='$github_username'
EOF

as_root install -m 0755 /dev/stdin "$sync_helper" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ ! -r "$1" ]; then
  printf '%s\n' 'Error: expected a readable sync configuration file.' >&2
  exit 1
fi

. "$1"
keys_dir="$target_home/.ssh"
keys_file="$keys_dir/authorized_keys"
temporary_keys="$(mktemp "$keys_dir/.authorized_keys.github.XXXXXX")"
cleanup() {
  rm -f "$temporary_keys"
}
trap cleanup EXIT

curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 --max-time 30 \\
  "https://github.com/$github_username.keys" > "$temporary_keys"

if [ ! -s "$temporary_keys" ]; then
  printf '%s\n' 'Error: GitHub returned no SSH keys; keeping the current authorized_keys file.' >&2
  exit 1
fi

if ! ssh-keygen -l -f "$temporary_keys" >/dev/null 2>&1; then
  printf '%s\n' 'Error: GitHub returned invalid SSH key data; keeping the current authorized_keys file.' >&2
  exit 1
fi

chmod 0600 "$temporary_keys"
mv -f "$temporary_keys" "$keys_file"
EOF

as_root install -m 0644 /dev/stdin "/etc/systemd/system/$service_name" <<EOF
[Unit]
Description=Refresh GitHub SSH keys for $target_user
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=$target_user
Group=$target_group
ExecStart=$sync_helper $sync_config
EOF

as_root install -m 0644 /dev/stdin "/etc/systemd/system/$timer_name" <<EOF
[Unit]
Description=Refresh GitHub SSH keys for $target_user every four hours

[Timer]
OnCalendar=*-*-* 00/4:00:00
Persistent=true
Unit=$service_name

[Install]
WantedBy=timers.target
EOF

as_root systemctl daemon-reload
as_root systemctl start "$service_name"
as_root systemctl enable --now "$timer_name"

auth_config='/etc/ssh/sshd_config.d/99-github-publickey-only.conf'
auth_staging="$(as_root mktemp /etc/ssh/sshd_config.d/.99-github-publickey-only.XXXXXX)"
auth_backup="$(as_root mktemp /etc/ssh/sshd_config.d/.99-github-publickey-only.backup.XXXXXX)"
had_auth_config=false

if [ -e "$auth_config" ]; then
  as_root cp --archive "$auth_config" "$auth_backup"
  had_auth_config=true
fi

as_root install -m 0644 /dev/stdin "$auth_staging" <<'EOF'
# Managed by Configure GitHub public-key SSH access.
PubkeyAuthentication yes
AuthenticationMethods publickey
PasswordAuthentication no
KbdInteractiveAuthentication no
GSSAPIAuthentication no
HostbasedAuthentication no
PermitEmptyPasswords no
EOF
as_root install -m 0644 "$auth_staging" "$auth_config"
as_root rm -f "$auth_staging"

if ! as_root /usr/sbin/sshd -t; then
  if [ "$had_auth_config" = true ]; then
    as_root mv -f "$auth_backup" "$auth_config"
  else
    as_root rm -f "$auth_config"
  fi
  printf '%s\n' 'Error: SSH configuration validation failed; restored the previous managed configuration.' >&2
  exit 1
fi
as_root rm -f "$auth_backup"

as_root systemctl reload ssh.service
printf 'SSH public-key-only authentication is enabled. GitHub keys for %s now refresh every four hours. Verify a new SSH login before ending this session.\n' "$target_user"
)
