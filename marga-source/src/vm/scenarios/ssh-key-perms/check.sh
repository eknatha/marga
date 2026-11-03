pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ "$(stat -c %U /home/deploy/.ssh)" = "deploy" ] && [ "$(stat -c %U /home/deploy/.ssh/authorized_keys)" = "deploy" ] && pass "both belong to deploy" || fail "the owner of .ssh or authorized_keys is not deploy"
[ "$(stat -c %a /home/deploy/.ssh)" = "700" ] && pass ".ssh is mode 700" || fail ".ssh is mode $(stat -c %a /home/deploy/.ssh), expected 700"
[ "$(stat -c %a /home/deploy/.ssh/authorized_keys)" = "600" ] && pass "authorized_keys is mode 600" || fail "authorized_keys is mode $(stat -c %a /home/deploy/.ssh/authorized_keys), expected 600"
grep -q 'AAAAC3Nza' /home/deploy/.ssh/authorized_keys && pass "the key is still in the file" || fail "the key was removed from authorized_keys"
