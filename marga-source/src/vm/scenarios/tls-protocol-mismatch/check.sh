pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok -tls1_3 && pass "a TLS 1.3 client connects" || fail "a TLS 1.3 client does not connect"
tlsok -tls1_2 && pass "a TLS 1.2 client still connects" || fail "a TLS 1.2 client no longer connects"
