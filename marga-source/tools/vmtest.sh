#!/bin/sh
# Host-side test of every VM scenario: the checks must fail before the fix and pass after it. Needs root (chroot, mount).
# usage: tools/vmtest.sh [scenario]
cd "$(dirname "$0")/.."
tools/mkvm.sh >/dev/null
R=$(mktemp -d); chmod 755 "$R"; cd "$R"
zcat "$OLDPWD/src/vm/initrd.gz" | cpio -id --quiet
mknod -m 666 dev/zero c 1 5; mknod -m 666 dev/urandom c 1 9; mknod -m 666 dev/tty c 5 0
BB="chroot $R /bin/busybox"
unshare --mount chroot $R /bin/busybox sh -c '/bin/busybox --install -s /bin'
fail=0
sol() { case $1 in
 disk-full) echo 'rm /var/log/app/debug.trace; : > /var/log/app/app.log';;
 deleted-open-file) echo 'p=$(pidof ingest); : > /proc/$p/fd/3';;
 permission-denied) echo 'chmod 755 /srv/app /srv/app/run.sh';;
 cpu-hog) echo 'kill $(pidof report-job); kill $(pidof yes)';;
 service-wont-start) echo 'sed -i "s/^PORT=.*/PORT=8080/;s#^ROOT=.*#ROOT=/srv/www#" /etc/web/web.conf; start-web';;
 port-in-use) echo 'kill $(pidof httpd); sleep 1; start-web';;
 stale-pidfile) echo 'rm /run/web.pid; start-web';;
 bad-hosts) echo 'echo "127.0.0.2 db.internal" >> /etc/hosts';;
 broken-symlink) echo 'ln -sfn releases/2024-09 /opt/app/current';;
 find-error-spike) echo "n=\$(awk '\$9==502' /var/log/web/access.log | wc -l); ip=\$(awk '\$9==502{print \$1}' /var/log/web/access.log | sort | uniq -c | sort -rn | head -1 | awk '{print \$2}'); printf 'count=%s\nip=%s\n' \$n \$ip > /root/answer.txt";;
 shell-script-bug) printf '%s\n' "printf '#!/bin/sh\nset -eu\nSRC=\$1\ncp -r \"\$SRC\" /backup/\necho \"backup finished OK\"\n' > /usr/local/bin/backup.sh";;
 path-and-env) echo "printf 'export PATH=\$PATH:/opt/tools/bin\nexport APP_ENV=staging\n' > /root/.profile";;
esac; }
for s in $(ls "$R/scen"); do
  [ -n "$1" ] && [ "$1" != "$s" ] && continue
  run() { unshare --pid --fork --mount --mount-proc="$R/proc" chroot $R /bin/busybox sh -c "export PATH=/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin; mkdir -p /root /tmp /run /var/log /backup; [ -s /etc/passwd ] || printf 'root:x:0:0:root:/root:/bin/sh\n' > /etc/passwd; [ -s /etc/group ] || printf 'root:x:0:\n' > /etc/group; [ -s /etc/hosts ] || echo '127.0.0.1 localhost' > /etc/hosts; $1" 2>&1; }
  echo "== $s"
  run ". /scen/$s/setup.sh; echo ---before; sh /scen/$s/check.sh; echo ---apply; $(sol $s); echo ---after; sh /scen/$s/check.sh" > "$R/out.$s" 2>&1
  b=$(sed -n '/---before/,/---apply/p' "$R/out.$s" | grep -c '^FAIL')
  a=$(sed -n '/---after/,$p' "$R/out.$s" | grep -c '^FAIL')
  p=$(sed -n '/---after/,$p' "$R/out.$s" | grep -c '^PASS')
  echo "before: $b failing, after: $a failing, $p passing"
  [ "$b" -ge 1 ] && [ "$a" -eq 0 ] && [ "$p" -ge 1 ] || { fail=1; cat "$R/out.$s" | cut -c1-200; }
done
rm -rf "$R"
exit $fail
