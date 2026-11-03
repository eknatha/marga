pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
rm -f /srv/proj/.probe
su -s /bin/sh alice -c 'touch /srv/proj/.probe' 2>/dev/null
g=$(stat -c %G /srv/proj/.probe 2>/dev/null); rm -f /srv/proj/.probe
[ "$g" = "devs" ] && pass "new files get the group devs" || fail "a new file gets the group '$g'"
m=$(stat -c %a /srv/proj); case $m in 2775|2770|2775) pass "the folder is group-writable ($m)";; *) fail "folder mode is $m";; esac
