pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
rm -rf /run/single.lock /run/single.log
/usr/local/bin/single-run >/dev/null 2>&1 &
/usr/local/bin/single-run >/dev/null 2>&1 &
i=0; while [ $i -lt 40 ]; do sleep 0.25; pidof single-run >/dev/null || break; i=$((i+1)); done
n=$(wc -l < /run/single.log 2>/dev/null | tr -d ' ')
[ "$n" = "1" ] && pass "two simultaneous copies ran the job once" || fail "the job ran ${n:-0} times, expected 1"
[ ! -e /run/single.lock ] && pass "the lock is cleaned up" || fail "the lock was left behind"
rm -f /run/single.log
/usr/local/bin/single-run >/dev/null 2>&1; sleep 1
[ "$(wc -l < /run/single.log 2>/dev/null | tr -d ' ')" = "1" ] && pass "a single run still works" || fail "a single run no longer works"
