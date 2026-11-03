pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
got=$(sed -n 's/^version=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "2.4.1" ] && pass "the version is 2.4.1" || fail "answer.txt says '$got', expected 2.4.1"
