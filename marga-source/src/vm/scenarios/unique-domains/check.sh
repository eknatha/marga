pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(awk '{for(i=1;i<=NF;i++) if($i ~ /^email=/){sub(/^email=.*@/,"",$i); print $i}}' /srv/data/signups.txt | sort -u | wc -l | tr -d ' ')
got=$(sed -n 's/^domains=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "$want" ] && pass "the number of domains is right ($want)" || fail "answer.txt says '$got', not the number of different email= domains"
