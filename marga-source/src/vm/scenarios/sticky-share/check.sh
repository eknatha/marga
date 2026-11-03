pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
m=$(stat -c %a /srv/share)
[ "$m" = "1777" ] && pass "/srv/share is mode 1777 (sticky and open)" || fail "/srv/share mode is $m, expected 1777"
