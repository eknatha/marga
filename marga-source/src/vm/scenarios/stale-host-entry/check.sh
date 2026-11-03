pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(api-check 2>&1)
[ "$out" = "api ok" ] && pass "api-check prints: api ok" || fail "api-check says: $out"
grep -qE '^127\.0\.0\.1[[:space:]]+localhost' /etc/hosts && pass "localhost is still there" || fail "the localhost line was removed"
