pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-net/netlib.sh
[ "$(reach 10.0.2.10 5432)" = "orders-db ready" ] && pass "the database answers" || fail "the database does not answer"
ip route | grep -q '^10.0.2.0/24 via 10.0.1.254' && pass "a route to 10.0.2.0/24 via the router exists" || fail "there is no route to 10.0.2.0/24 via 10.0.1.254"
