pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(find /srv/work -name '*.tmp' | wc -l)
[ "$n" -eq 0 ] && pass "no .tmp files are left" || fail "$n .tmp files are still there"
n=$(find /srv/work -name '*.keep' | wc -l)
[ "$n" -eq 2 ] && pass "both .keep files are kept" || fail "found $n .keep files, expected 2"
