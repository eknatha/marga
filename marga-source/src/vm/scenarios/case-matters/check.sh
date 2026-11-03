pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(app-info 2>/dev/null)
[ "$out" = "name: shop" ] && pass "app-info prints: name: shop" || fail "app-info prints: '$out'"
[ -f /srv/app/config.yml ] && pass "the folder was not renamed" || fail "/srv/app/config.yml is missing"
