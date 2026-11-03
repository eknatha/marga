pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(find /usr/local /opt -type f \( -perm -4000 -o -perm -2000 \) | wc -l)
[ "$n" -eq 0 ] && pass "no setuid or setgid files are left" || fail "$n files still have the setuid or setgid bit"
[ -x /usr/local/bin/backup-helper ] && [ -x /opt/tools/scan ] && pass "both programs are still executable" || fail "a program lost its executable bit"
