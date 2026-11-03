pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
openssl x509 -in /etc/tls/shop.pem -noout -ext subjectAltName 2>/dev/null | grep -q 'DNS:shop.lab' && pass "the certificate names shop.lab" || fail "the certificate does not name shop.lab"
openssl x509 -in /etc/tls/shop.pem -noout -ext subjectAltName 2>/dev/null | grep -q 'DNS:www.shop.lab' && pass "www.shop.lab is still covered" || fail "www.shop.lab is no longer covered"
