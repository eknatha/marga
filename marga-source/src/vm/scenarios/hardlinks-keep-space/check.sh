pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
u=$(df -k /srv/store | awk 'NR==2{gsub("%","",$5);print $5}')
[ "$u" -lt 50 ] && pass "/srv/store is $u% full" || fail "/srv/store is still $u% full"
[ -f /srv/store/keep.txt ] && pass "keep.txt is still there" || fail "keep.txt was deleted"
