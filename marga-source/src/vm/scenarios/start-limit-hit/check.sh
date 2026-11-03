pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q '^workers=[0-9][0-9]*$' /etc/indexer.conf && pass "workers is a number" || fail "workers in /etc/indexer.conf is not a number"
sleep 3
systemctl is-active indexer >/dev/null && pass "indexer is active and stays up" || fail "indexer is not active"
