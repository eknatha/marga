pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
inst nginx-lite && pass "nginx-lite is installed" || fail "nginx-lite is not installed"
[ -f /usr/sbin/nginx-lite ] && pass "its program is on disk" || fail "its program is not on disk"
[ -s /var/lib/apt/lists/1.idx ] && pass "the package lists are filled in" || fail "the package lists are empty"
