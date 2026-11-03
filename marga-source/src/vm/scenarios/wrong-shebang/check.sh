pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(/opt/tools/cleanup.sh 2>&1)
[ "$out" = "cleanup done" ] && pass "the script prints: cleanup done" || fail "the script gives: $out"
t "the script still does the same job" "the script body was changed" grep -q 'echo "cleanup done"' /opt/tools/cleanup.sh
