pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(sh -c 'export PATH=/usr/local/bin:/bin:/sbin:/usr/bin:/usr/sbin; . /root/.profile; deploytool' 2>&1)
[ "$out" = "deploytool 2.0" ] && pass "after login deploytool is version 2.0" || fail "after login deploytool says: $out"
[ -x /usr/local/bin/deploytool ] && pass "the old version is still installed" || fail "the old version was removed"
