pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ "$(cat /proc/sys/net/ipv4/ip_forward)" = "1" ] && pass "forwarding is on now" || fail "forwarding is still off"
grep -Eq '^net\.ipv4\.ip_forward[[:space:]]*=[[:space:]]*1$' /etc/sysctl.conf && pass "it is saved in /etc/sysctl.conf" || fail "/etc/sysctl.conf does not set net.ipv4.ip_forward = 1"
