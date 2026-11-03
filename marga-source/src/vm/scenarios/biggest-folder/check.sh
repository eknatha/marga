pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(du -sk /srv/data/* | sort -rn | head -1 | awk -F/ '{print $NF}')
got=$(sed -n 's/^biggest=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "$want" ] && pass "the biggest folder is $want" || fail "answer.txt says '$got', the biggest folder is not that"
