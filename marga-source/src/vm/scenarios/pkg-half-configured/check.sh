pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
inst() { /usr/local/bin/dpkg -s "$1" 2>/dev/null | grep -q "ok installed"; }
/usr/local/bin/dpkg -s queue-lite 2>/dev/null | grep -q "ok installed" && pass "queue-lite is fully configured" || fail "queue-lite is not fully configured"
inst other-tool && pass "other-tool is installed" || fail "other-tool is not installed"
[ -d /var/spool/queue ] && pass "the queue directory exists" || fail "the queue directory is missing"
