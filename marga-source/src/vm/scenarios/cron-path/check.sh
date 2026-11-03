pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(env -i PATH=/usr/bin:/bin /opt/job/nightly.sh 2>&1)
[ "$out" = "nightly ok" ] && pass "the job works with a minimal PATH" || fail "with a minimal PATH the job says: $out"
[ -x /opt/tools/bin/mytool ] && pass "mytool was not moved" || fail "mytool was moved or removed"
