pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
pidof stuck-job >/dev/null && fail "stuck-job is still running" || pass "stuck-job is stopped"
pidof web-heartbeat >/dev/null && pass "web-heartbeat is still running" || fail "web-heartbeat was stopped"
