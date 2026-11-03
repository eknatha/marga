#!/bin/sh
# Runs one shell snippet inside the packed lab root (host chroot, new PID and network namespace). Needs root.
# usage: tools/vmrun.sh 'snippet'      (prints the output)
cd "$(dirname "$0")/.."
R=$(mktemp -d); chmod 755 "$R"; cd "$R"
zcat "$OLDPWD/src/vm/initrd.gz" | cpio -id --quiet
mknod -m 666 dev/zero c 1 5; mknod -m 666 dev/urandom c 1 9; mknod -m 666 dev/tty c 5 0
unshare --mount chroot $R /bin/busybox sh -c '/bin/busybox --install -s /bin'
unshare --net --pid --fork --mount --mount-proc="$R/proc" chroot $R /bin/busybox sh -c "export PATH=/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin; mount -t sysfs sys /sys 2>/dev/null; ifconfig lo 127.0.0.1 up; mkdir -p /root /tmp /run /var/log; . /usr/lib/marga-pkg/fn.sh; printf 'root:x:0:0:root:/root:/bin/sh\nnobody:x:65534:65534:nobody:/:/bin/sh\n' > /etc/passwd; [ -s /etc/group ] || printf 'root:x:0:\n' > /etc/group; $1" 2>&1
rm -rf "$R"
