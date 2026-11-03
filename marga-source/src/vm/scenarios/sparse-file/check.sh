pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(du -k /srv/vm/disk.img | cut -f1)
got=$(sed -n 's/^used_kb=//p' /root/answer.txt 2>/dev/null | head -1)
[ -n "$got" ] && [ "$got" = "$want" ] && pass "the real usage is $want KB" || fail "answer.txt says '$got', du -k says $want"
ls -l /srv/vm/disk.img | awk '{exit !($5 > 100000000)}' && pass "the file is still 200 MB long" || fail "the file was changed"
