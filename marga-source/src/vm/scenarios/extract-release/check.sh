pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ "$(cat /opt/app/VERSION 2>/dev/null)" = "1.4" ] && pass "VERSION says 1.4" || fail "/opt/app/VERSION is missing or wrong"
out=$(/opt/app/bin/run 2>&1)
[ "$out" = "run 1.4" ] && pass "bin/run prints: run 1.4" || fail "bin/run gives: $out"
