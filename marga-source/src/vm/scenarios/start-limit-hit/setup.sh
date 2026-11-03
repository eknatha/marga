mkdir -p /etc/systemd/system
echo 'workers=four' > /etc/indexer.conf
cat > /usr/local/bin/indexer <<'X'
#!/bin/sh
w=$(sed -n 's/^workers=//p' /etc/indexer.conf)
case "$w" in ''|*[!0-9]*) echo "indexer: invalid value for workers: $w" >&2; exit 2;; esac
echo "indexer: $w workers"
while :; do sleep 1; done
X
chmod +x /usr/local/bin/indexer
cat > /etc/systemd/system/indexer.service <<'X'
[Unit]
Description=Search indexer

[Service]
ExecStart=/usr/local/bin/indexer
Restart=always
RestartSec=0.2

[Install]
WantedBy=multi-user.target
X
systemctl start indexer >/dev/null 2>&1; sleep 4; true
