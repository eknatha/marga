pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(crontab -l 2>/dev/null | grep -c '/usr/local/bin/backup')
[ "$n" -eq 1 ] && pass "there is one backup line" || fail "found $n backup lines in the crontab"
crontab -l 2>/dev/null | grep -qE '^\*/5 \* \* \* \* /usr/local/bin/backup' && pass "it runs every 5 minutes" || fail "the schedule is not */5 * * * *"
