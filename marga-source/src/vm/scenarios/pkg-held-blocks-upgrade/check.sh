pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
/usr/local/bin/dpkg -s libtls-lite 2>/dev/null | grep -q '^Version: 1.2.0' && pass "libtls-lite is at 1.2.0" || fail "libtls-lite is not at 1.2.0"
inst webapp-lite && pass "webapp-lite is still installed" || fail "webapp-lite was removed"
