pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
inst payd-lite && pass "payd-lite is installed" || fail "payd-lite is not installed"
grep -q rebuilt /usr/bin/payd-lite 2>/dev/null && pass "it is the current build" || fail "it is not the current build"
