pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(grep 'Failed password' /var/log/auth.log | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort | uniq -c | awk '$1>=5{print $2}' | sort)
got=$(sort /root/blocklist.txt 2>/dev/null)
[ -n "$want" ] && [ "$got" = "$want" ] && pass "the block list is right ($(echo "$want" | wc -l | tr -d ' ') addresses)" || fail "/root/blocklist.txt does not match the addresses with 5 or more failed logins"
