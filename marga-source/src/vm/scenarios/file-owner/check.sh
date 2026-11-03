pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
su -s /bin/sh webapp -c 'touch /srv/uploads/check.tmp' 2>/dev/null && pass "webapp can create files in /srv/uploads" || fail "webapp still cannot write in /srv/uploads"
rm -f /srv/uploads/check.tmp
m=$(stat -c %a /srv/uploads); case $m in *[2367]) fail "the folder is writable by everyone ($m)";; *) pass "the folder is not writable by everyone ($m)";; esac
