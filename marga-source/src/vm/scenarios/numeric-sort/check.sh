pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
want=$(awk 'NR==1||$1>m{m=$1} END{print m}' /srv/data/latency.txt)
got=$(sed -n 's/^max_ms=//p' /root/answer.txt 2>/dev/null | head -1)
[ "$got" = "$want" ] && pass "the maximum is $want ms" || fail "answer.txt says '$got', the real maximum is not that"
