pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
grep -q -- '--port 9090' /run/api.args 2>/dev/null && pass "api runs with --port 9090" || fail "api runs with: $(cat /run/api.args 2>/dev/null)"
systemctl is-active api >/dev/null && pass "api is active" || fail "api is not active"
