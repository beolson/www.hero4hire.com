#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_ID='debian-13-x86_64-install-developer-tools'
SCRIPT_VERSION='1.0.0'
MARKER="/var/lib/hero4hire/system-scripts/${SCRIPT_ID}.version"
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
trap 'printf "Installation stopped at line %s. Earlier changes remain; no success marker was written.\n" "$LINENO" >&2' ERR

[[ $# -eq 0 ]] || fail 'This script takes no arguments.'
[[ $EUID -ne 0 ]] || fail 'Run bash as the intended non-root user, without sudo; the script prompts for sudo itself.'
source /etc/os-release
[[ ${ID:-} == debian && ${VERSION_ID:-} == 13 ]] || fail 'Requires Debian 13.'
[[ $(dpkg --print-architecture) == amd64 && $(uname -m) == x86_64 ]] || fail 'Requires x86_64.'
command -v sudo >/dev/null || fail 'The invoking account needs sudo installed and authorized.'
account_home=$(getent passwd "$(id -un)" | cut -d: -f6)
[[ $HOME == "$account_home" && -d $HOME && -w $HOME ]] || fail 'HOME must be your writable account home.'
sudo -v
sudo test ! -e "$MARKER" || fail "Already completed. Review changes before deliberately removing $MARKER."

# Serialize this host-wide bootstrap, including the final marker check.
sudo install -d -m 0755 /var/lib/hero4hire/system-scripts
sudo touch "/var/lib/hero4hire/system-scripts/${SCRIPT_ID}.lock"
sudo chmod 0644 "/var/lib/hero4hire/system-scripts/${SCRIPT_ID}.lock"
exec 9<"/var/lib/hero4hire/system-scripts/${SCRIPT_ID}.lock"
flock -n 9 || fail 'Another developer-tools installation is running.'
sudo test ! -e "$MARKER" || fail "Already completed: $MARKER"

sudo apt-get update
sudo apt-get upgrade --yes
sudo apt-get install --yes ca-certificates curl gnupg git unzip xz-utils \
  nodejs npm podman uidmap slirp4netns fuse-overlayfs

work_dir=$(mktemp -d)
trap 'rm -rf -- "$work_dir"' EXIT
download() {
  curl --fail --show-error --silent --location --retry 3 \
    --proto '=https' --proto-redir '=https' --tlsv1.2 "$1" -o "$2"
  [[ -s $2 ]] || fail "Empty download: $1"
}

# Repository keys are scoped to their respective repositories.
download https://cli.github.com/packages/githubcli-archive-keyring.gpg "$work_dir/githubcli.gpg"
download https://packages.microsoft.com/keys/microsoft.asc "$work_dir/microsoft.asc"
gpg --batch --yes --dearmor --output "$work_dir/microsoft.gpg" "$work_dir/microsoft.asc"
sudo install -d -m 0755 /etc/apt/keyrings
sudo install -m 0644 "$work_dir/githubcli.gpg" /etc/apt/keyrings/githubcli-archive-keyring.gpg
sudo install -m 0644 "$work_dir/microsoft.gpg" /etc/apt/keyrings/hero4hire-microsoft.gpg
cat > "$work_dir/github-cli.list" <<'REPO'
deb [arch=amd64 signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main
REPO
cat > "$work_dir/azure-cli.sources" <<'REPO'
Types: deb
URIs: https://packages.microsoft.com/repos/azure-cli/
Suites: bookworm
Components: main
Architectures: amd64
Signed-By: /etc/apt/keyrings/hero4hire-microsoft.gpg
REPO
sudo install -m 0644 "$work_dir/github-cli.list" /etc/apt/sources.list.d/github-cli.list
sudo install -m 0644 "$work_dir/azure-cli.sources" /etc/apt/sources.list.d/azure-cli.sources
sudo apt-get update
sudo apt-get install --yes gh azure-cli

# Back up shell configuration before any installer can change it.
backup_dir=$(mktemp -d "$HOME/.hero4hire-shell-backup.XXXXXXXX")
for rc in .bashrc .profile .bash_profile; do
  if [[ -e $HOME/$rc ]]; then cp -a -- "$HOME/$rc" "$backup_dir/$rc"; fi
done
printf 'Shell backups: %s\n' "$backup_dir"
if [[ ! -d $HOME/.oh-my-bash ]]; then
  download https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh "$work_dir/oh-my-bash.sh"
  bash "$work_dir/oh-my-bash.sh" --unattended
fi
[[ -f $HOME/.oh-my-bash/oh-my-bash.sh ]] || fail 'Existing Oh My Bash installation is incomplete.'
[[ -f $HOME/.bashrc ]] || fail 'Missing .bashrc.'
if ! grep -Eq '^[[:space:]]*(source|\.)[[:space:]].*oh-my-bash\.sh' "$HOME/.bashrc"; then
  fail 'Existing .bashrc does not load Oh My Bash. Configure it before retrying.'
fi
sed -i -E '/^[[:space:]]*(export[[:space:]]+)?OSH_THEME=/d' "$HOME/.bashrc"
sed -i '1i OSH_THEME="agnoster"' "$HOME/.bashrc"

mkdir -p "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$HOME/.bun/bin:/usr/local/bin:$PATH"
download https://bun.sh/install "$work_dir/bun.sh"
bash "$work_dir/bun.sh"
download https://aka.ms/install-azd.sh "$work_dir/azd.sh"
bash "$work_dir/azd.sh" --version stable --install-folder "$HOME/.local/share/azd" --symlink-folder "$HOME/.local/bin"
download https://herdr.dev/install.sh "$work_dir/herdr.sh"
HERDR_INSTALL_DIR="$HOME/.local/bin" sh "$work_dir/herdr.sh"
download https://astral.sh/uv/install.sh "$work_dir/uv.sh"
UV_INSTALL_DIR="$HOME/.local/bin" sh "$work_dir/uv.sh"
# Node.js supplies the runtime for the npm-distributed CLI launchers.
npm install --global --prefix "$HOME/.local" @openai/codex@latest @microsoft/aspire-cli@latest

path_line='export PATH="$HOME/.local/bin:$HOME/.bun/bin:$PATH"'
for rc in "$HOME/.bashrc" "$HOME/.profile"; do
  if ! grep -Fqx "$path_line" "$rc" 2>/dev/null; then printf '\n%s\n' "$path_line" >> "$rc"; fi
done
if [[ -f $HOME/.bash_profile ]] && ! grep -Fqx "$path_line" "$HOME/.bash_profile"; then
  printf '\n%s\n' "$path_line" >> "$HOME/.bash_profile"
fi

bun --version
gh --version
az version
azd version
codex --version
herdr --version
uv --version
podman --version
aspire --version
[[ -f $HOME/.oh-my-bash/themes/agnoster/agnoster.theme.sh ]] || fail 'Agnoster theme is missing.'
printf 'Installation verified. Open a new Bash terminal. Use a Powerline-compatible terminal font.\n'
printf 'Rootless Podman needs subordinate UID/GID ranges; For Aspire, set ASPIRE_CONTAINER_RUNTIME=podman; some integrations also need a socket.\n'
printf 'No automatic reboot is performed; review whether package upgrades require one.\n'
# The marker is the final successful action; a newer version is also blocked.
printf '%s\n' "$SCRIPT_VERSION" | sudo tee "$MARKER" >/dev/null
