pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
systemctl is-active billing >/dev/null && pass "billing is running" || fail "billing is not running"
[ "$(systemctl is-enabled billing)" = enabled ] && pass "billing is enabled" || fail "billing is not enabled, a reboot would leave it down"
if [ "$(systemctl is-enabled billing)" = enabled ]; then sh /usr/lib/marga-sd/boot; sleep 1; systemctl is-active billing >/dev/null && pass "billing is back after a simulated reboot" || fail "billing did not come back after a simulated reboot"; else fail "billing would stay down after a reboot"; fi
