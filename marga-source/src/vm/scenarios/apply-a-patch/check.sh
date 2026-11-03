pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -qx 'MAX_CONN=200' /etc/app/app.conf && pass "MAX_CONN is 200" || fail "MAX_CONN is not 200"
grep -qx 'LOG_LEVEL=warn' /etc/app/app.conf && pass "LOG_LEVEL is warn" || fail "LOG_LEVEL is not warn"
grep -qx 'REGION=ap-south-1' /etc/app/app.conf && grep -qx 'TIMEOUT=30' /etc/app/app.conf && pass "the other lines are unchanged" || fail "other lines of app.conf changed"
