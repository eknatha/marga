pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 2
[ "$(cat /run/webd.state 2>/dev/null)" = "hello v2" ] && pass "webd now says: hello v2" || fail "webd still says: $(cat /run/webd.state 2>/dev/null)"
p=$(cat /run/webd.orig 2>/dev/null); [ -n "$p" ] && [ -d /proc/$p ] && pass "the original process is still running" || fail "the original webd process is gone, it was restarted"
