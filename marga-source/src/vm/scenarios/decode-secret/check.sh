pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ "$(cat /root/db-password.txt 2>/dev/null)" = "S3cr3t-Pa55" ] && pass "the password is decoded" || fail "/root/db-password.txt is missing or wrong"
[ "$(stat -c %a /root/db-password.txt 2>/dev/null)" = "600" ] && pass "the file is mode 600" || fail "the file mode is $(stat -c %a /root/db-password.txt 2>/dev/null), expected 600"
