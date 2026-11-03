pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
su -s /bin/sh www -c 'cat /srv/site/css/app.css' >/dev/null 2>&1 && pass "www can read css/app.css" || fail "www cannot read /srv/site/css/app.css"
d=$(find /srv/site -type d ! -perm 755 | wc -l); [ "$d" -eq 0 ] && pass "all folders are 755" || fail "$d folders are not 755"
f=$(find /srv/site -type f ! -perm 644 | wc -l); [ "$f" -eq 0 ] && pass "all files are 644" || fail "$f files are not 644"
