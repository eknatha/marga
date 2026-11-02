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
( cd "$T" && find . | cpio -o -H newc --quiet | gzip -9 ) > src/vm/initrd.gz
rm -rf "$T"
ls -l src/vm/initrd.gz
