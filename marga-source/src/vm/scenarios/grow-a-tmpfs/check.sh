pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
s=$(df -k /var/cache/app | awk 'NR==2{print $2}')
[ "${s:-0}" -ge 8000 ] && pass "the volume is $s KB" || fail "the volume is only ${s:-0} KB"
[ -s /var/cache/app/cache.bin ] && pass "cache.bin survived" || fail "cache.bin is gone"
