pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
. /usr/lib/marga-pkg/tlslib.sh
tlsok() { tls_client "$@" | grep -q 'Verification: OK'; }
tlsok && pass "the client check passes" || fail "the client check does not pass"
[ "$(stat -c %a /etc/tls/shop.key)" -le 640 ] && [ $(( $(stat -c %a /etc/tls/shop.key) % 100 )) -eq 0 ] && pass "the key is not readable by others" || fail "the key is readable by the group or by others"
