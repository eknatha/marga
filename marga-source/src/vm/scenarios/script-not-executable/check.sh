pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "hello-report is executable" "hello-report has no executable bit" test -x /usr/local/bin/hello-report
out=$(/usr/local/bin/hello-report 2>&1)
[ "$out" = "report ready" ] && pass "running it prints: report ready" || fail "running it gives: $out"
