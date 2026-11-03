pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(/opt/tools/sync.sh 2>&1)
[ "$out" = "sync ok" ] && pass "the script prints: sync ok" || fail "the script gives: $out"
t "no carriage returns are left" "the file still has carriage returns" sh -c '! grep -q "$(printf "\r")" /opt/tools/sync.sh' 
