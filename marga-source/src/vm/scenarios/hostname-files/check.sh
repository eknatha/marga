pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ "$(cat /etc/hostname)" = "web-01" ] && pass "/etc/hostname says web-01" || fail "/etc/hostname is '$(cat /etc/hostname)'"
grep -qE '^127\.0\.1\.1[[:space:]]+web-01$' /etc/hosts && pass "127.0.1.1 maps to web-01" || fail "the 127.0.1.1 line does not say web-01"
grep -qE '^127\.0\.0\.1[[:space:]]+localhost' /etc/hosts && pass "localhost is still there" || fail "the localhost line was removed"
