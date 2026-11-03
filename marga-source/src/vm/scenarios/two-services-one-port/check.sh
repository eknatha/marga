pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
a=$(wget -q -T 2 -O - http://127.0.0.1:8080/ 2>/dev/null); [ "$a" = "service A" ] && pass "service A answers on 8080" || fail "8080 does not answer service A"
b=$(wget -q -T 2 -O - http://127.0.0.1:8081/ 2>/dev/null); [ "$b" = "service B" ] && pass "service B answers on 8081" || fail "8081 does not answer service B"
