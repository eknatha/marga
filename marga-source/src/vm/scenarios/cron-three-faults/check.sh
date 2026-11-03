pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
pidof crond >/dev/null && pass "crond is running" || fail "crond is not running"
[ -x /usr/local/bin/nightly-clean.sh ] && pass "the script is executable" || fail "the script is not executable"
cmd=$(crontab -l 2>/dev/null | grep -v '^#' | head -1 | cut -d' ' -f6-)
rm -f /run/clean.done; env -i /bin/sh -c "$cmd" >/dev/null 2>&1; [ -f /run/clean.done ] && pass "the cron command works with an empty environment" || fail "the cron command does not work with an empty environment"
