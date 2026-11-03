pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
systemctl is-active reports >/dev/null && pass "reports is active" || fail "reports is not active"
[ "$(cat /run/reports.dir 2>/dev/null)" = /var/reports ] && pass "reports has its REPORT_DIR" || fail "reports did not get REPORT_DIR"
[ "$(systemctl is-enabled reports)" = enabled ] && pass "reports is enabled" || fail "reports is not enabled"
