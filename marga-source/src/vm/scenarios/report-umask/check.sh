pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
rm -f /srv/out/report.txt; report-gen
m=$(stat -c %a /srv/out/report.txt 2>/dev/null)
[ "$m" = "644" ] && pass "a new report is mode 644" || fail "a new report is mode '$m', expected 644"
