pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 3
zcat /var/log/svc/app.log.1.gz 2>/dev/null | grep -q 'OLDLINE-77' && pass "app.log.1.gz holds the old lines" || fail "app.log.1.gz is missing or does not hold the old lines"
[ -s /var/log/svc/app.log ] && ! grep -q OLDLINE /var/log/svc/app.log && pass "a fresh app.log is being written" || fail "app.log is missing, empty or still has the old lines"
pidof app-logger >/dev/null && pass "app-logger is still running" || fail "app-logger was stopped"
