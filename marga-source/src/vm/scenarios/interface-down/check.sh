pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
ping -c 1 -W 2 127.0.0.1 >/dev/null 2>&1 && pass "127.0.0.1 answers ping" || fail "127.0.0.1 does not answer ping"
out=$(wget -q -T 2 -O - http://127.0.0.1:8080/ 2>/dev/null)
case "$out" in *"MARGA local ok"*) pass "the web service answers on 8080";; *) fail "nothing answers on http://127.0.0.1:8080/";; esac
