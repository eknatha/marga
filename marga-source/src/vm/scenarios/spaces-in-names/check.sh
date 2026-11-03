pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q 'Q3 numbers are final' "/backup/Q3 report.txt" 2>/dev/null && pass "the Q3 report is in /backup" || fail "/backup/Q3 report.txt is missing"
[ -f "/srv/papers/Q3 report.txt" ] && pass "the original is still there" || fail "the original was moved"
