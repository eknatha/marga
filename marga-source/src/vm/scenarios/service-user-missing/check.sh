pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
systemctl is-active metrics-agent >/dev/null && pass "metrics-agent is active" || fail "metrics-agent is not active"
p=$(pidof metrics-agent | awk '{print $1}'); u=$(awk '/^Uid:/{print $2}' /proc/$p/status 2>/dev/null)
[ "$u" = 1001 ] && pass "it runs as uid 1001" || fail "it does not run as uid 1001 (uid ${u:-unknown})"
