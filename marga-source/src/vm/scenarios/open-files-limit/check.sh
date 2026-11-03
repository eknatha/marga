pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
p=$(pidof worker | awk '{print $1}')
[ -n "$p" ] && pass "worker is running" || fail "worker is not running, start it with start-worker"
grep -q '^worker: ok' /run/worker.status 2>/dev/null && pass "worker reports ok" || fail "worker status: $(cat /run/worker.status 2>/dev/null)"
if [ -n "$p" ]; then l=$(awk '/Max open files/{print $4}' /proc/$p/limits); [ "${l:-0}" -ge 256 ] && pass "the soft limit of worker is $l" || fail "the soft limit of worker is ${l:-unknown}"; else fail "no limit to read, worker is not running"; fi
