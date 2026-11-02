#!/bin/sh
# Packs the lab root file system (BusyBox, init, the scenarios) into src/vm/initrd.gz.
# Needs only cpio and gzip. The kernel (src/vm/bzImage) is built separately, see src/vm/NOTICE.md.
set -eu
cd "$(dirname "$0")/.."
T=$(mktemp -d); chmod 755 "$T"
mkdir -p "$T/bin" "$T/sbin" "$T/usr/bin" "$T/usr/local/bin" "$T/proc" "$T/sys" "$T/dev" "$T/etc" "$T/tmp" "$T/root" "$T/scen"
mknod -m 600 "$T/dev/console" c 5 1; mknod -m 666 "$T/dev/null" c 1 3
cp src/vm/busybox "$T/bin/busybox"; chmod 755 "$T/bin/busybox"
ln -s busybox "$T/bin/sh"
cp src/vm/init "$T/init"; chmod 755 "$T/init"
cp -r src/vm/scenarios/. "$T/scen/"
# the systemd-style shim (a teaching imitation, not systemd) and the network helpers
mkdir -p "$T/usr/lib/marga-sd" "$T/usr/lib/marga-net"
cp src/vm/shims/systemctl src/vm/shims/journalctl "$T/usr/bin/"; chmod 755 "$T/usr/bin/systemctl" "$T/usr/bin/journalctl"
cp src/vm/shims/sdlib.sh src/vm/shims/sdrun "$T/usr/lib/marga-sd/"; cp src/vm/shims/sdboot "$T/usr/lib/marga-sd/boot"; chmod 755 "$T/usr/lib/marga-sd/sdrun" "$T/usr/lib/marga-sd/boot"
cp src/vm/shims/netlib.sh "$T/usr/lib/marga-net/"
cp src/vm/shims/inns "$T/usr/bin/"; chmod 755 "$T/usr/bin/inns"
( cd "$T" && find . | cpio -o -H newc --quiet | gzip -9 ) > src/vm/initrd.gz
rm -rf "$T"
ls -l src/vm/initrd.gz
