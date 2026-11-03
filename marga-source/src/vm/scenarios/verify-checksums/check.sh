pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
got=$(sed -n 's/^bad=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "app-1.1.tar.gz" ] && pass "the corrupted file is app-1.1.tar.gz" || fail "answer.txt says '$got', which is not the file that fails its checksum"
[ -f /srv/downloads/app-1.0.tar.gz ] && [ -f /srv/downloads/app-1.1.tar.gz ] && [ -f /srv/downloads/app-1.2.tar.gz ] && pass "no download was deleted" || fail "a download was deleted"
