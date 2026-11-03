pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
grep -q 'ORDER-9917 paid 1200' /root/recovered.dat 2>/dev/null && grep -q 'ORDER-9918 paid 450' /root/recovered.dat && pass "both orders were recovered" || fail "/root/recovered.dat is missing or does not hold both orders"
pidof ledger-writer >/dev/null && pass "ledger-writer is still running" || fail "ledger-writer was stopped, the data is lost with it"
