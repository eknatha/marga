pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(su -s /bin/sh maya -c 'cat /srv/reports/q3.txt' 2>&1)
case "$out" in *"Q3 revenue"*) pass "maya can read q3.txt";; *) fail "maya gets: $out";; esac
m=$(stat -c %a /srv/reports); case $m in *[1-7]) fail "/srv/reports is open to everyone ($m)";; *) pass "/srv/reports is closed to others ($m)";; esac
