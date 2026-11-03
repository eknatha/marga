pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(healthcheck 2>&1)
[ "$out" = "healthy" ] && pass "healthcheck prints: healthy" || fail "healthcheck says: $out"
out=$(wget -q -T 2 -O - http://127.0.0.1:8080/ 2>/dev/null)
case "$out" in *"MARGA ok"*) pass "the service still runs on 8080";; *) fail "the service no longer answers on 8080";; esac
