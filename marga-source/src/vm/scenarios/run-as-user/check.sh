pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
n=$(pidof webd | wc -w)
[ "$n" -eq 1 ] && pass "exactly one webd is running" || fail "found $n webd processes, expected 1"
u=$(ps -o user,comm | awk '$2=="webd"{print $1; exit}')
[ "$u" = "webapp" ] && pass "webd runs as webapp" || fail "webd runs as '$u'"
