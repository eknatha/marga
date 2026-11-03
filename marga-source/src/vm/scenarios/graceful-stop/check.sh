pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 2
pidof queue-worker >/dev/null && fail "queue-worker is still running" || pass "queue-worker is stopped"
[ -f /var/spool/q/flushed ] && pass "the queue was flushed to disk" || fail "no flushed file: the worker was killed without a clean stop"
