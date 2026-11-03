pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(wget -q -T 2 -O - http://127.0.0.1:8085/ 2>/dev/null)
[ "$out" = "Welcome to the shop" ] && pass "the home page is served" || fail "the home page is not served (got: '$out')"
pidof httpd >/dev/null && pass "the web server is still running" || fail "the web server is not running"
