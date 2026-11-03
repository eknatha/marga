pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
systemctl is-active db-sync >/dev/null && pass "db-sync is active" || fail "db-sync is not active"
[ "$(cat /run/dbsync.mode 2>/dev/null)" = live ] && pass "db-sync runs live" || fail "db-sync mode is $(cat /run/dbsync.mode 2>/dev/null)"
