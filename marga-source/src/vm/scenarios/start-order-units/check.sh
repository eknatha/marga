pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
systemctl is-active orders-db >/dev/null && pass "orders-db is active" || fail "orders-db is not active"
systemctl is-active orders >/dev/null && pass "orders is active" || fail "orders is not active"
[ "$(systemctl is-enabled orders-db)" = enabled ] && [ "$(systemctl is-enabled orders)" = enabled ] && pass "both units are enabled" || fail "both units must be enabled"
if [ "$(systemctl is-enabled orders-db)" = enabled ] && [ "$(systemctl is-enabled orders)" = enabled ]; then sh /usr/lib/marga-sd/boot; sleep 2; systemctl is-active orders >/dev/null && systemctl is-active orders-db >/dev/null && pass "both come back after a simulated reboot" || fail "after a simulated reboot one of them is down"; else fail "after a reboot the units would not both start"; fi
