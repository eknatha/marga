pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
inst report-tool && pass "report-tool is installed" || fail "report-tool is not installed"
/usr/local/bin/dpkg -s libchart 2>/dev/null | grep -q '^Version: 2\.' && pass "libchart is version 2 or newer" || fail "libchart is still the old version"
