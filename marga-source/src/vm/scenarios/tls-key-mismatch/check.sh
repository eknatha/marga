pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
grep -q '^KEY=/etc/tls/shop.key$' /etc/shop-tls.conf && pass "the configuration uses shop.key" || fail "the configuration does not use shop.key"
[ -f /etc/tls/shop-old.key ] && pass "the old key was left alone" || fail "the old key was deleted"
