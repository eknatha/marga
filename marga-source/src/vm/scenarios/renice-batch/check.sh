pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
p=$(pidof batch-crunch | awk '{print $1}')
if [ -z "$p" ]; then fail "batch-crunch is not running"; else
n=$(awk '{print $19}' /proc/$p/stat 2>/dev/null)
[ "${n:-0}" -ge 10 ] && pass "batch-crunch runs at nice $n" || fail "batch-crunch nice value is ${n:-0}, expected 10 or more"; fi
a=$(pidof api-server | awk '{print $1}')
[ -n "$a" ] && [ "$(awk '{print $19}' /proc/$a/stat)" -eq 0 ] && pass "api-server is running at normal priority" || fail "api-server is not running or its priority was changed"
