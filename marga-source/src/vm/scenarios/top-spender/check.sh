pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(awk -F, '{s[$2]+=$3} END{for(c in s) if(s[c]>m){m=s[c]; b=c}; print b}' /srv/sales/orders.csv)
name=$(awk -F, -v id="$want" '$1==id{print $2}' /srv/sales/customers.csv)
got=$(sed -n 's/^top=//p' /root/answer.txt 2>/dev/null | head -1)
[ -n "$name" ] && [ "$got" = "$name" ] && pass "the top spender is $name" || fail "answer.txt says '$got', which is not the top spender"
