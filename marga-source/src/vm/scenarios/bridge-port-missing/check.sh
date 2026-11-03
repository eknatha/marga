pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-net/netlib.sh
inns web ping -c1 -W2 10.0.9.3 >/dev/null 2>&1 && pass "web can ping db" || fail "web cannot ping db"
ls /sys/class/net/br0/brif | grep -q '^p-db$' && pass "p-db is attached to br0" || fail "p-db is not attached to br0"
ls /sys/class/net/br0/brif | grep -q '^p-web$' && pass "p-web is attached to br0" || fail "p-web is not attached to br0"
