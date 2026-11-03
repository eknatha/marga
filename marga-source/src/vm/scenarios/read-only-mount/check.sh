pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "files can be created in /srv/records" "/srv/records is still read-only" sh -c 'touch /srv/records/.probe && rm -f /srv/records/.probe'
grep -q 'opening balance' /srv/records/ledger 2>/dev/null && pass "the ledger is intact" || fail "the ledger is missing"
grep -q ' /srv/records ' /proc/mounts && pass "the volume is still mounted" || fail "the volume was unmounted"
