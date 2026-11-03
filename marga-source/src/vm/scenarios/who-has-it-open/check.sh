pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
got=$(sed -n 's/^owner=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "writer-b" ] && pass "the owner is writer-b" || fail "answer.txt says '$got', which is not the process that has mystery.log open"
pidof writer-a writer-b writer-c >/dev/null && [ "$(pidof writer-a writer-b writer-c | wc -w)" -eq 3 ] && pass "all three writers still run" || fail "a writer process was stopped"
