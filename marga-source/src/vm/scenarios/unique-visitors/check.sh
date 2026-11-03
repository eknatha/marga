pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(sort -u /srv/data/visitors.txt | wc -l | tr -d ' ')
got=$(tr -d ' \n' < /root/unique.txt 2>/dev/null)
[ "$got" = "$want" ] && pass "the number of different visitors is right ($want)" || fail "/root/unique.txt has '$got', not the number of different names"
