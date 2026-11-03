pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(grep -c ' ERROR ' /var/log/app/app.log)
got=$(tr -d ' \n' < /root/errors.txt 2>/dev/null)
[ "$got" = "$want" ] && pass "the count of ERROR lines is right ($want)" || fail "/root/errors.txt has '$got', not the number of ERROR lines"
