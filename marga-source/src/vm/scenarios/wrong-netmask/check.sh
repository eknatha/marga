pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-net/netlib.sh
[ "$(reach 10.0.3.20 8080)" = "storefront ok" ] && pass "the storefront answers" || fail "the storefront does not answer"
ip addr show h-w | grep -q 'inet 10.0.3.1/24' && pass "h-w has 10.0.3.1/24" || fail "h-w does not have 10.0.3.1/24"
