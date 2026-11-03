pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ -f /srv/dst/conf/app.conf ] && [ -f /srv/dst/run.sh ] && pass "the files were copied" || fail "/srv/dst is missing files"
[ "$(stat -c %u /srv/dst/conf/app.conf 2>/dev/null)" = "1001" ] && pass "the owner is kept" || fail "the owner of app.conf is not 1001"
[ "$(stat -c %Y /srv/dst/conf/app.conf 2>/dev/null)" = "1700000000" ] && pass "the modification time is kept" || fail "the modification time changed"
[ -L /srv/dst/latest ] && [ "$(readlink /srv/dst/latest)" = "run.sh" ] && pass "latest is still a symlink to run.sh" || fail "latest is not a symlink to run.sh"
