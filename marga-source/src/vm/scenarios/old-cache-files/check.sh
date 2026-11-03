pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(ls /var/cache/app/old-*.dat 2>/dev/null | wc -l)
[ "$n" -eq 0 ] && pass "all old files are gone" || fail "$n old files are still there"
n=$(ls /var/cache/app/new-*.dat 2>/dev/null | wc -l)
[ "$n" -eq 3 ] && pass "the three newer files are kept" || fail "only $n of the 3 newer files are left"
