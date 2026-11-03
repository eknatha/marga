pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(awk '$9==200{s+=$10} END{print s}' /var/log/web/access.log)
got=$(sed -n 's/^bytes=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "$want" ] && pass "the number of bytes is right ($want)" || fail "answer.txt says '$got', not the total for status 200"
