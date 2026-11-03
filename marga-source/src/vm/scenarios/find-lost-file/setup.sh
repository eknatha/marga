for d in 2024/q1 2024/q3 2025/q2 2025/q4 2026/q1 2026/q2/april 2026/q2/may; do mkdir -p /srv/archive/$d; echo "decoy $d" > /srv/archive/$d/invoice-$(echo $d | tr -d '/q').pdf; done
echo "INVOICE-0417 total 1280" > /srv/archive/2026/q2/april/invoice-2026-0417.pdf
echo "INVOICE-0417 draft, do not use" > /srv/archive/2026/q2/may/invoice-2026-0417-draft.pdf
