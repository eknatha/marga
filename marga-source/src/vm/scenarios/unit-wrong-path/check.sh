pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sleep 1
systemctl is-active ledger >/dev/null && pass "ledger is active" || fail "ledger is not active"
grep -q '^ExecStart=/opt/ledger/bin/ledgerd' /etc/systemd/system/ledger.service && pass "the unit points at the real program" || fail "the unit still points at a missing file"
