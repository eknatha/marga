pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
pidof app-writer >/dev/null && pass "app-writer is running" || fail "app-writer is not running"
a=$(wc -c < /var/log/app/heartbeat.log 2>/dev/null || echo 0); sleep 2; b=$(wc -c < /var/log/app/heartbeat.log 2>/dev/null || echo 0)
[ "$b" -gt "$a" ] && pass "heartbeat.log is growing" || fail "heartbeat.log is not growing"
u=$(df /var/log/app | awk 'NR==2{gsub("%","",$5); print $5}'); [ "${u:-100}" -lt 50 ] && pass "the volume is $u percent full" || fail "the volume is ${u:-?} percent full"
