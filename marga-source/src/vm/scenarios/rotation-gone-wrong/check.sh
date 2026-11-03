pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
s1=$(wc -c < /var/log/app/app.log 2>/dev/null || echo 0); sleep 3; s2=$(wc -c < /var/log/app/app.log 2>/dev/null || echo 0)
[ "$s2" -gt "$s1" ] && pass "new lines reach app.log" || fail "app.log is not growing, the logger still writes to the rotated file"
u=$(df /var/log/app | awk 'NR==2{gsub("%","",$5); print $5}'); [ "${u:-100}" -lt 70 ] && pass "the volume is $u percent full" || fail "the volume is ${u:-?} percent full"
