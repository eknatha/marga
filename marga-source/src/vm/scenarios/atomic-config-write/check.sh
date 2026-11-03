pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
printf 'a=0\nb=0\nc=0\n' > /etc/app/live.conf; rm -f /etc/app/live.conf.new
/usr/local/bin/update-conf >/dev/null 2>&1 &
sleep 0.5
mid=$(wc -l < /etc/app/live.conf | tr -d ' ')
sleep 2
[ "$mid" = "3" ] && pass "live.conf was complete while the script ran" || fail "live.conf had $mid lines while the script ran, a reader would see a broken file"
[ "$(tr '\n' ' ' < /etc/app/live.conf)" = "a=1 b=2 c=3 " ] && pass "live.conf ends with the new values" || fail "live.conf does not end with a=1 b=2 c=3"
