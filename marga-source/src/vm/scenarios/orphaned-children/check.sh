pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
pidof batch-parent >/dev/null && fail "batch-parent is still running" || pass "batch-parent is stopped"
pidof batch-child >/dev/null && fail "batch-child workers are still running" || pass "no batch-child workers are left"
pidof api-server >/dev/null && pass "api-server is still running" || fail "api-server was stopped"
