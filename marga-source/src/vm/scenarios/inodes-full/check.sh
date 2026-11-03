pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
i=0; ok=1; while [ $i -lt 20 ]; do touch /var/sessions/probe-$i 2>/dev/null || ok=0; i=$((i+1)); done
rm -f /var/sessions/probe-*
[ $ok -eq 1 ] && pass "20 new files can be created" || fail "creating new files still fails"
[ -f /var/sessions/current-session ] && pass "current-session is kept" || fail "current-session was deleted"
grep -q ' /var/sessions ' /proc/mounts && pass "the volume is still mounted" || fail "the volume was unmounted"
