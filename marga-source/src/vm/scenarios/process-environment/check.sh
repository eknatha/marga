pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
p=$(pidof db-proxy | awk '{print $1}')
want=$(tr '\0' '\n' < /proc/$p/environ 2>/dev/null | sed -n 's/^DB_HOST=//p')
got=$(sed -n 's/^host=//p' /root/answer.txt 2>/dev/null | head -1)
[ -n "$want" ] && [ "$got" = "$want" ] && pass "the host is $want" || fail "answer.txt says '$got', not the value in the process environment"
