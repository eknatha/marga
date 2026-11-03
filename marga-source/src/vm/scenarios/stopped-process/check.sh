pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
a=$(cat /run/etl.hb 2>/dev/null); sleep 3; b=$(cat /run/etl.hb 2>/dev/null)
[ -n "$a" ] && [ "$a" != "$b" ] && pass "the heartbeat file changes again" || fail "the heartbeat file does not change"
p=$(cat /run/etl.orig); [ -d /proc/$p ] && pass "it is the original process" || fail "the original process is gone"
