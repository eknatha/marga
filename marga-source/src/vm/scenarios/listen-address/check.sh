pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
a=$(wget -q -T 2 -O - http://127.0.0.2:8095/ 2>/dev/null); [ "$a" = "public site" ] && pass "127.0.0.2:8095 answers" || fail "127.0.0.2:8095 does not answer"
b=$(wget -q -T 2 -O - http://127.0.0.1:8095/ 2>/dev/null); [ "$b" = "public site" ] && pass "127.0.0.1:8095 answers" || fail "127.0.0.1:8095 does not answer"
