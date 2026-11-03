pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(run-app 2>&1)
[ "$out" = "connecting to db1:5432" ] && pass "run-app prints: connecting to db1:5432" || fail "run-app says: $out"
grep -q '^DB_PORT=5432$' /etc/app/app.env && pass "DB_PORT is kept" || fail "DB_PORT is missing or not in NAME=value form"
