pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q '^Restart=on-failure' /etc/systemd/system/datasync.service && pass "the unit has Restart=on-failure" || fail "the unit has no Restart=on-failure line"
sleep 6
systemctl is-active datasync >/dev/null && pass "datasync is active after its early crashes" || fail "datasync is not active"
