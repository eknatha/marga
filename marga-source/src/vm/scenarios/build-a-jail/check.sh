pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(chroot /jail /bin/cat /etc/motd 2>&1)
[ "$out" = "inside the jail" ] && pass "chroot /jail /bin/cat /etc/motd prints: inside the jail" || fail "chroot says: $out"
[ ! -e /jail/etc/passwd ] && pass "the jail has no copy of the host passwd file" || fail "/jail/etc/passwd exists"
