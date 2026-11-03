pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
systemctl is-active queue-worker >/dev/null && pass "queue-worker is active" || fail "queue-worker is not active"
[ "$(systemctl is-enabled queue-worker)" = enabled ] && pass "queue-worker is enabled" || fail "queue-worker is not enabled"
