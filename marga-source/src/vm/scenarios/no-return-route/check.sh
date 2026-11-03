pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-net/netlib.sh
[ "$(reach 10.0.2.10 5432)" = "orders-db ready" ] && pass "the database answers" || fail "the database does not answer"
inns db ip route | grep -q '^default via 10.0.2.254' && pass "the database has a default route through the router" || fail "the database has no default route"
