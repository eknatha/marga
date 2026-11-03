pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "/root/invoice.pdf has the right invoice" "/root/invoice.pdf is missing or is not invoice 0417" grep -q 'INVOICE-0417 total 1280' /root/invoice.pdf
t "the original is still in the archive" "the original was moved or deleted" test -f /srv/archive/2026/q2/april/invoice-2026-0417.pdf
