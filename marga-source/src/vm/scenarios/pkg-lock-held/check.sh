pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
inst jq-lite && pass "jq-lite is installed" || fail "jq-lite is not installed"
ps | grep -v grep | grep -q 'unattended-upgrade' && fail "the stuck unattended-upgrade process is still running" || pass "the stuck process is gone"
