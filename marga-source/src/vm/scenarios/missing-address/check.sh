pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(wget -q -T 2 -O - http://10.20.30.40:8090/ 2>/dev/null)
[ "$out" = "api ok" ] && pass "http://10.20.30.40:8090/ answers: api ok" || fail "nothing answers on http://10.20.30.40:8090/"
ip addr 2>/dev/null | grep -q '10.20.30.40' && pass "the address is configured" || fail "the address 10.20.30.40 is not configured"
