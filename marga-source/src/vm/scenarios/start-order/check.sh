pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
pidof db-svc >/dev/null && pass "db-svc is running" || fail "db-svc is not running"
pidof app-svc >/dev/null && pass "app-svc is running" || fail "app-svc is not running, run stack-up after fixing the order"
head -1 /etc/stack.order | grep -qx db && pass "the order file lists db first" || fail "the order file does not list db first"
