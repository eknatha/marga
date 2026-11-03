pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(fetch-all 2>&1)
[ "$out" = "fetched 3 parts" ] && pass "fetch-all prints: fetched 3 parts" || fail "fetch-all prints: $out"
grep -q 'sleep \$n' /usr/local/bin/fetch-all && grep -q '&' /usr/local/bin/fetch-all && pass "the jobs still run in the background" || fail "the jobs no longer run in parallel"
