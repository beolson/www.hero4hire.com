#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_ID='debian-13-x86_64-install-developer-tools'
SCRIPT_VERSION='1.1.0'
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
sudo apt-get install --yes ca-certificates curl gnupg git unzip xz-utils jq build-essential

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
else
  omb_remote=$(git -C "$HOME/.oh-my-bash" remote get-url origin)
  case "$omb_remote" in
    https://github.com/ohmybash/oh-my-bash|https://github.com/ohmybash/oh-my-bash.git|git@github.com:ohmybash/oh-my-bash.git) ;;
    *) fail 'Existing Oh My Bash origin is not the official repository.' ;;
  esac
  [[ -z $(git -C "$HOME/.oh-my-bash" status --porcelain --untracked-files=no) ]] || fail 'Oh My Bash has local edits; review them before updating.'
  git -C "$HOME/.oh-my-bash" fetch origin master
  git -C "$HOME/.oh-my-bash" merge --ff-only FETCH_HEAD
  [[ $(git -C "$HOME/.oh-my-bash" rev-parse HEAD) == $(git -C "$HOME/.oh-my-bash" rev-parse FETCH_HEAD) ]] || fail 'Oh My Bash differs from the latest upstream commit.'
fi
[[ -f $HOME/.oh-my-bash/oh-my-bash.sh ]] || fail 'Existing Oh My Bash installation is incomplete.'
[[ -f $HOME/.bashrc ]] || fail 'Missing .bashrc.'
if ! grep -Eq '^[[:space:]]*(source|\.)[[:space:]].*oh-my-bash\.sh' "$HOME/.bashrc"; then
  fail 'Existing .bashrc does not load Oh My Bash. Configure it before retrying.'
fi
sed -i -E '/^[[:space:]]*(export[[:space:]]+)?OSH_THEME=/d' "$HOME/.bashrc"
sed -i '1i OSH_THEME="agnoster"' "$HOME/.bashrc"

mkdir -p "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$HOME/.bun/bin:$HOME/.cargo/bin:$HOME/go/bin:/usr/local/bin:$PATH"
download https://bun.sh/install "$work_dir/bun.sh"
bash "$work_dir/bun.sh"
download https://aka.ms/install-azd.sh "$work_dir/azd.sh"
bash "$work_dir/azd.sh" --version stable --install-folder "$HOME/.local/share/azd" --symlink-folder "$HOME/.local/bin"
download https://herdr.dev/install.sh "$work_dir/herdr.sh"
HERDR_INSTALL_DIR="$HOME/.local/bin" sh "$work_dir/herdr.sh"
download https://astral.sh/uv/install.sh "$work_dir/uv.sh"
UV_INSTALL_DIR="$HOME/.local/bin" sh "$work_dir/uv.sh"
# Resolve each latest stable release once and verify its published asset digest.
install_release_binary() {
  local repo=$1 asset=$2 member=$3 binary=$4 release_url release_digest
  download "https://api.github.com/repos/$repo/releases/latest" "$work_dir/$binary-release.json"
  release_url=$(jq -er --arg name "$asset" '.assets[] | select(.name == $name) | .browser_download_url' "$work_dir/$binary-release.json")
  release_digest=$(jq -er --arg name "$asset" '.assets[] | select(.name == $name) | .digest' "$work_dir/$binary-release.json")
  [[ $release_digest =~ ^sha256:[0-9a-f]{64}$ ]] || fail "Missing or invalid upstream $binary SHA-256 digest."
  [[ $release_url == "https://github.com/$repo/releases/download/"* ]] || fail "Unexpected $binary download URL."
  download "$release_url" "$work_dir/$binary.tar.gz"
  printf '%s  %s\n' "${release_digest#sha256:}" "$work_dir/$binary.tar.gz" | sha256sum --check --status
  mkdir "$work_dir/$binary"
  tar -xzf "$work_dir/$binary.tar.gz" -C "$work_dir/$binary" --no-same-owner "$member"
  install -m 0755 "$work_dir/$binary/$member" "$HOME/.local/bin/$binary"
}
install_release_binary openai/codex codex-x86_64-unknown-linux-musl.tar.gz codex-x86_64-unknown-linux-musl codex
install_release_binary podman-container-tools/podman podman-remote-static-linux_amd64.tar.gz bin/podman-remote-static-linux_amd64 podman-remote
# Expose the remote client under the familiar command without installing an engine.
ln -sfn podman-remote "$HOME/.local/bin/podman"

download https://aspire.dev/install.sh "$work_dir/aspire.sh"
bash "$work_dir/aspire.sh" --quality release --install-path "$HOME/.local/bin" --skip-path

# Rust's stable toolchain is managed by the official rustup installer.
# Keep locations consistent even when the calling environment customizes them.
export CARGO_HOME="$HOME/.cargo" RUSTUP_HOME="$HOME/.rustup"
download https://sh.rustup.rs "$work_dir/rustup.sh"
sh "$work_dir/rustup.sh" -y --profile minimal --default-toolchain stable --no-modify-path
"$HOME/.cargo/bin/rustup" update stable
"$HOME/.cargo/bin/rustup" default stable

# Extract Go into a fresh tree, never over an existing Go installation.
download 'https://go.dev/dl/?mode=json' "$work_dir/go-releases.json"
go_file=$(jq -er '[.[] | select(.stable == true)][0].files[] | select(.os == "linux" and .arch == "amd64" and .kind == "archive") | .filename' "$work_dir/go-releases.json")
go_digest=$(jq -er --arg name "$go_file" '.[] | .files[] | select(.filename == $name) | .sha256' "$work_dir/go-releases.json")
[[ $go_file =~ ^go[0-9]+\.[0-9]+(\.[0-9]+)?\.linux-amd64\.tar\.gz$ ]] || fail 'Unexpected Go archive filename.'
[[ $go_digest =~ ^[0-9a-f]{64}$ ]] || fail 'Missing or invalid upstream Go SHA-256 digest.'
download "https://go.dev/dl/$go_file" "$work_dir/go.tar.gz"
printf '%s  %s\n' "$go_digest" "$work_dir/go.tar.gz" | sha256sum --check --status
mkdir -p "$HOME/.local/share/hero4hire-go"
go_tree=$(mktemp -d "$HOME/.local/share/hero4hire-go/install.XXXXXXXX")
tar -xzf "$work_dir/go.tar.gz" -C "$go_tree" --no-same-owner
ln -sfn "$go_tree/go/bin/go" "$HOME/.local/bin/go"
ln -sfn "$go_tree/go/bin/gofmt" "$HOME/.local/bin/gofmt"
unset GOROOT

path_line='export PATH="$HOME/.local/bin:$HOME/.bun/bin:$HOME/.cargo/bin:$HOME/go/bin:$PATH"'
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
aspire --version
podman-remote --version
podman --version
"$HOME/.cargo/bin/rustc" +stable --version
"$HOME/.cargo/bin/cargo" +stable --version
go version
[[ -f $HOME/.oh-my-bash/themes/agnoster/agnoster.theme.sh ]] || fail 'Agnoster theme is missing.'
printf 'Installation verified. Open a new Bash terminal. Use a Powerline-compatible terminal font.\n'
printf 'Podman is a remote client: configure a connection to an existing Podman engine. Aspire application SDKs require separate setup.\n'
printf 'No automatic reboot is performed; review whether package upgrades require one.\n'
# The marker is the final successful action; a newer version is also blocked.
printf '%s\n' "$SCRIPT_VERSION" | sudo tee "$MARKER" >/dev/null
