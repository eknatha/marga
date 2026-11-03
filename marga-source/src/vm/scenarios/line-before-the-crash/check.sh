pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(awk '/segfault/{print last; exit} /REQ-/{last=$2}' /var/log/app/crash.log)
got=$(sed -n 's/^req=//p' /root/answer.txt 2>/dev/null | head -1)
[ -n "$want" ] && [ "$got" = "$want" ] && pass "the crashing request is $want" || fail "answer.txt says '$got', which is not the request before the segfault"
