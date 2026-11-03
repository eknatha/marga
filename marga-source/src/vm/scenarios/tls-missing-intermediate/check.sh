pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
[ "$(openssl s_client -connect 127.0.0.1:8443 -servername shop.lab -showcerts </dev/null 2>/dev/null | grep -c 'BEGIN CERTIFICATE')" -ge 2 ] && pass "the service sends its certificate and the intermediate" || fail "the service sends only one certificate"
grep -q "BEGIN CERTIFICATE" /etc/tls/chain.pem && pass "chain.pem holds the intermediate" || fail "chain.pem is empty"
