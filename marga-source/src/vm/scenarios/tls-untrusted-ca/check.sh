pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
ls /usr/local/share/ca-certificates/*.crt >/dev/null 2>&1 && pass "the company CA is installed as a .crt file" || fail "no .crt file in /usr/local/share/ca-certificates"
shop-tls status >/dev/null 2>&1 && pass "the service is still running" || fail "the service is not running"
