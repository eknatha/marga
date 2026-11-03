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
FX=$(mktemp -d)
node -e "const f=require(process.argv[2]),fs=require('fs');for(const k in f)fs.writeFileSync(process.argv[1]+'/'+k,f[k].join('\n')+'\n')" "$FX" "$OLDPWD/tools/vmfixes.json"
node -e "
const sc=require(process.argv[2]),an=require(process.argv[3]),fs=require('fs'),core=require(process.argv[4]);
for(const x of sc){ if(x.kind!=='diagnose')continue; const a=an[x.id]; if(!a){console.error('no answers for '+x.id);process.exit(2)}
 fs.writeFileSync(process.argv[1]+'/'+x.id+'.probe',a.probe+'\n'); fs.writeFileSync(process.argv[1]+'/'+x.id+'.re',a.probe_re+'\n');
 const g=(t)=>core.grade({kind:'answer',accept:x.accept,ci:true},t).ok;
 if(!g(a.good)||g(a.bad)){console.error('answer grading wrong for '+x.id);process.exit(2)} }" "$FX" "$OLDPWD/src/vm/scenarios.json" "$OLDPWD/tools/vmanswers.json" "$OLDPWD/src/app/challenge-core.js" || exit 2
sol() { cat "$FX/$1"; }
for s in $(ls "$R/scen"); do
  [ -n "$1" ] && case " $* " in *" $s "*) ;; *) continue;; esac
  run() { unshare --net --pid --fork --mount --mount-proc="$R/proc" chroot $R /bin/busybox sh -c "export PATH=/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin; mount -t sysfs sys /sys 2>/dev/null; ifconfig lo 127.0.0.1 up; ifconfig lo:2 127.0.0.2 up; mkdir -p /root /tmp /run /var/log /backup; . /usr/lib/marga-pkg/fn.sh; [ -s /etc/passwd ] || printf 'root:x:0:0:root:/root:/bin/sh\n' > /etc/passwd; [ -s /etc/group ] || printf 'root:x:0:\n' > /etc/group; [ -s /etc/hosts ] || echo '127.0.0.1 localhost' > /etc/hosts; $1" 2>&1; }
  echo "== $s"
  if [ -f "$FX/$s.probe" ]; then
    run ". /scen/$s/setup.sh; echo ---probe; $(cat $FX/$s.probe)" > "$R/out.$s" 2>&1
    if sed -n '/---probe/,$p' "$R/out.$s" | grep -Eq "$(cat $FX/$s.re)"; then echo "diagnose: the answer can be found with the probe"; else echo "diagnose probe FAILED"; fail=1; cut -c1-200 "$R/out.$s"; fi
    continue
  fi
  run ". /scen/$s/setup.sh; echo ---before; sh /scen/$s/check.sh; echo ---apply; $(sol $s); echo ---after; sh /scen/$s/check.sh" > "$R/out.$s" 2>&1
  b=$(sed -n '/---before/,/---apply/p' "$R/out.$s" | grep -c '^FAIL')
  a=$(sed -n '/---after/,$p' "$R/out.$s" | grep -c '^FAIL')
  p=$(sed -n '/---after/,$p' "$R/out.$s" | grep -c '^PASS')
  echo "before: $b failing, after: $a failing, $p passing"
  [ "$b" -ge 1 ] && [ "$a" -eq 0 ] && [ "$p" -ge 1 ] || { fail=1; cat "$R/out.$s" | cut -c1-200; }
done
rm -rf "$R" "$FX"
exit $fail
