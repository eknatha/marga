pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-net/netlib.sh
[ "$(reach 10.0.3.20 8080)" = "storefront ok" ] && pass "the storefront answers" || fail "the storefront does not answer from outside"
inns web netstat -ln | grep -q ':8080' && pass "something listens on port 8080" || fail "nothing listens on port 8080"
