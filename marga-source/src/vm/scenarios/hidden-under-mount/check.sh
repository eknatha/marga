pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q 'TOTAL,4200' /backup/old-data/ledger.csv 2>/dev/null && pass "the old ledger is saved in /backup/old-data" || fail "/backup/old-data/ledger.csv is missing or wrong"
grep -q ' /srv/data ' /proc/mounts && pass "the new volume is still mounted" || fail "the new volume was unmounted"
[ -f /srv/data/fresh.log ] && pass "the new data is intact" || fail "fresh.log is gone from the new volume"
