pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(diff /root/staging.conf /root/prod.conf | sed -n 's/^-\([A-Z_]*\)=.*/\1/p')
got=$(sed -n 's/^key=//p' /root/answer.txt 2>/dev/null | head -1)
[ -n "$want" ] && [ "$got" = "$want" ] && pass "the differing key is $want" || fail "answer.txt says '$got', which is not the key that differs"
