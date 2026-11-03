pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q ' /mnt/data ' /proc/mounts && fail "/mnt/data is still mounted" || pass "/mnt/data is unmounted"
pidof api-server >/dev/null && pass "api-server is still running" || fail "api-server was stopped"
pidof nightly-report >/dev/null && fail "nightly-report is still running" || pass "nightly-report is stopped"
