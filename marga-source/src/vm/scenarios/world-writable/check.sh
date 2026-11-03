pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(find /srv/apps -type f -perm -002 | wc -l); [ "$n" -eq 0 ] && pass "no file is writable by others" || fail "$n files are still writable by others"
n=$(find /srv/apps -type d -perm -002 ! -perm -1000 | wc -l); [ "$n" -eq 0 ] && pass "no folder is writable by others (except sticky ones)" || fail "$n folders are still writable by others"
[ "$(stat -c %a /srv/apps/shared)" = "1777" ] && pass "/srv/apps/shared is still 1777" || fail "/srv/apps/shared is mode $(stat -c %a /srv/apps/shared)"
