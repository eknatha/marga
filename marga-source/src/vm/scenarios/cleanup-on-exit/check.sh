pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
touch /run/step.fail
/usr/local/bin/nightly-job >/dev/null 2>&1
rm -f /run/step.fail
[ ! -e /run/nightly.lock ] && pass "no lock is left after a failed run" || fail "a failed run leaves /run/nightly.lock behind"
out=$(/usr/local/bin/nightly-job 2>&1)
[ "$out" = "step done" ] && pass "a good run prints: step done" || fail "a good run prints: $out"
[ ! -e /run/nightly.lock ] && pass "no lock is left after a good run" || fail "a good run leaves the lock behind"
