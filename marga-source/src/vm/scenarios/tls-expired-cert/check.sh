pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
openssl x509 -in /etc/tls/shop.pem -noout -checkend 86400 >/dev/null 2>&1 && pass "the certificate on disk is valid for at least a day" || fail "the certificate on disk is expired"
