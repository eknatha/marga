mkdir -p /srv/out /usr/local/bin
cat > /usr/local/bin/report-gen <<'X'
#!/bin/sh
umask 077
echo "report for $(date +%F)" > /srv/out/report.txt
X
chmod +x /usr/local/bin/report-gen; report-gen
