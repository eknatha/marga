pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
systemctl is-active payments >/dev/null && pass "payments is active" || fail "payments is not active"
[ "$(cat /run/payments.mode 2>/dev/null)" = live ] && pass "payments runs in live mode" || fail "payments is not in live mode"
