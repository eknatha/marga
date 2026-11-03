pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
a=$(wget -q -T 2 -O - http://127.0.0.1:8080/ 2>/dev/null); [ "$a" = "web v2" ] && pass "port 8080 serves web v2" || fail "port 8080 serves: ${a:-nothing}"
grep -q '^db=db.internal$' /run/web.status 2>/dev/null && pass "web v2 uses db.internal" || fail "web v2 does not use db.internal"
