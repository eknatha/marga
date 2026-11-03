pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
/usr/local/bin/dpkg -s appd-lite 2>/dev/null | grep -q '^Version: 2.0.3' && pass "appd-lite is at 2.0.3" || fail "appd-lite is not at 2.0.3"
grep -q '2.0.3' /usr/bin/appd 2>/dev/null && pass "the program on disk is the 2.0.3 build" || fail "the program on disk is not the 2.0.3 build"
apt-mark showhold | grep -qx appd-lite && pass "appd-lite is on hold" || fail "appd-lite is not on hold"
