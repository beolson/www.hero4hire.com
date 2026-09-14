#!/usr/bin/env bash
(
set -euo pipefail

# Proxmox administrative tools are commonly installed in /usr/sbin, which
# may be absent from PATH in an SSH root shell or automation environment.
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
script_id='proxmox-9.2-x86_64-enable-pci-passthrough'
script_version='1.0.0'
marker_directory='/var/lib/hero4hire/system-scripts'
marker_file="$marker_directory/$script_id.version"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

if [ "$(id -u)" -ne 0 ]; then
  fail 'run this script as root.'
fi

for command in lspci update-initramfs; do
  command -v "$command" >/dev/null 2>&1 || fail "required command not found: $command"
done

command -v pveversion >/dev/null 2>&1 || fail 'pveversion was not found; this must run on Proxmox VE.'
if ! pveversion | grep -q '^pve-manager/9\.'; then
  fail 'this script is for Proxmox VE 9.x.'
fi

[ "$(uname -m)" = 'x86_64' ] || fail 'PCI passthrough is supported by this script only on x86_64.'

cpu_vendor=$(awk -F ': ' '/^vendor_id/ { print $2; exit }' /proc/cpuinfo)
case "$cpu_vendor" in
  GenuineIntel)
    grep -qw vmx /proc/cpuinfo || fail 'Intel virtualization (VMX) is unavailable; enable Intel Virtualization Technology in firmware.'
    iommu_parameter='intel_iommu=on'
    firmware_setting='Intel VT-d'
    ;;
  AuthenticAMD)
    grep -qw svm /proc/cpuinfo || fail 'AMD virtualization (SVM) is unavailable; enable SVM/AMD-V in firmware.'
    iommu_parameter='amd_iommu=on'
    firmware_setting='AMD IOMMU'
    ;;
  *)
    fail "unsupported CPU vendor: $cpu_vendor"
    ;;
esac

if [ ! -d /sys/kernel/iommu_groups ] || ! find /sys/kernel/iommu_groups -mindepth 1 -maxdepth 1 -type d -print -quit | grep -q .; then
  fail "$firmware_setting is not active: Linux exposes no IOMMU groups. Enable the firmware setting, reboot, and try again."
fi

if [ -e "$marker_file" ]; then
  completed_version=$(cat "$marker_file")
  fail "$script_id already completed at version ${completed_version:-unknown} (current version: $script_version). Review the host state before deliberately removing $marker_file."
fi

pci_ids=()
mapfile -t selected_devices < <(lspci -Dnnd 10de: | awk '{ print $1 }' | sed 's/^0000://')
[ "${#selected_devices[@]}" -gt 0 ] || fail 'no NVIDIA PCI devices were found.'

for device in "${selected_devices[@]}"; do
  sys_device="/sys/bus/pci/devices/0000:$device"
  [ -d "$sys_device" ] || fail "NVIDIA PCI device $device was not found in sysfs."
  [ -L "$sys_device/iommu_group" ] || fail "PCI device $device has no IOMMU group; verify $firmware_setting and reboot."

  vendor_id=$(<"$sys_device/vendor")
  device_id=$(<"$sys_device/device")
  pci_ids+=("${vendor_id#0x}:${device_id#0x}")
done

pci_id_list=$(IFS=,; printf '%s' "${pci_ids[*]}")
timestamp=$(date +%Y%m%d%H%M%S)

install -d -m 755 /etc/modprobe.d /etc/modules-load.d
if [ -e /etc/modprobe.d/99-pci-passthrough.conf ]; then
  cp -a /etc/modprobe.d/99-pci-passthrough.conf "/etc/modprobe.d/99-pci-passthrough.conf.$timestamp.bak"
fi
printf 'options vfio-pci ids=%s\n' "$pci_id_list" > /etc/modprobe.d/99-pci-passthrough.conf
printf '%s\n' vfio vfio_iommu_type1 vfio_pci > /etc/modules-load.d/vfio.conf

if [ -f /etc/kernel/cmdline ]; then
  cp -a /etc/kernel/cmdline "/etc/kernel/cmdline.$timestamp.bak"
  kernel_cmdline=$(</etc/kernel/cmdline)
  for parameter in "$iommu_parameter" iommu=pt; do
    case " $kernel_cmdline " in
      *" $parameter "*) ;;
      *) kernel_cmdline="$kernel_cmdline $parameter" ;;
    esac
  done
  printf '%s\n' "$kernel_cmdline" > /etc/kernel/cmdline
  command -v proxmox-boot-tool >/dev/null 2>&1 || fail 'proxmox-boot-tool is required when /etc/kernel/cmdline exists.'
  proxmox-boot-tool refresh
else
  command -v update-grub >/dev/null 2>&1 || fail 'update-grub was not found; this node needs either GRUB or proxmox-boot-tool.'
  if [ -e /etc/default/grub.d/99-pci-passthrough.cfg ]; then
    cp -a /etc/default/grub.d/99-pci-passthrough.cfg "/etc/default/grub.d/99-pci-passthrough.cfg.$timestamp.bak"
  fi
  install -d -m 755 /etc/default/grub.d
  printf 'GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT %s iommu=pt"\n' "$iommu_parameter" > /etc/default/grub.d/99-pci-passthrough.cfg
  update-grub
fi

update-initramfs -u -k all

install -d -m 0755 "$marker_directory"
printf '%s\n' "$script_version" | install -m 0644 /dev/stdin "$marker_file"

printf 'Configured VFIO for: %s\n' "${selected_devices[*]}"
printf '%s\n' 'Reboot this node before assigning the devices to a VM.'
printf '%s\n' 'After reboot, verify each device with: lspci -nnk -s ADDRESS (Kernel driver in use: vfio-pci).'
printf '%s\n' 'For a multi-function GPU, add every required function (usually graphics and HDMI/DP audio) to the VM.'
)
