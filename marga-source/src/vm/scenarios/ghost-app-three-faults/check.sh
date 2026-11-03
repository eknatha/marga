pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
p=$(pidof ghost-app | awk '{print $1}'); [ -n "$p" ] && pass "ghost-app is running" || fail "ghost-app is not running, run start-ghost"
u=$(awk '/^Uid:/{print $2}' /proc/$p/status 2>/dev/null); [ "$u" = 1200 ] && pass "it runs as uid 1200" || fail "it does not run as uid 1200 (uid ${u:-none})"
grep -q '^ok port=8088$' /var/lib/ghost/state 2>/dev/null && pass "its state says ok port=8088" || fail "its state file does not say ok port=8088"
