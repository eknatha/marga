pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
inst curl-lite && pass "curl-lite is installed" || fail "curl-lite is not installed"
grep -q '^deb http://127.0.0.1:8090/' /etc/apt/sources.list && pass "the source points at the working repository" || fail "the source still points at the wrong address"
