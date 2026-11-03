mkdir -p /etc/systemd/system
rm -f /run/datasync.count
cat > /usr/local/bin/datasync <<'X'
#!/bin/sh
n=$(cat /run/datasync.count 2>/dev/null || echo 0); n=$((n+1)); echo $n > /run/datasync.count
if [ "$n" -lt 3 ]; then sleep 1; echo "fatal: lost database connection"; exit 1; fi
echo "connected"
while :; do sleep 1; done
X
chmod +x /usr/local/bin/datasync
cat > /etc/systemd/system/datasync.service <<'X'
[Unit]
Description=Data sync

[Service]
ExecStart=/usr/local/bin/datasync
RestartSec=1

[Install]
WantedBy=multi-user.target
X
systemctl start datasync >/dev/null 2>&1; sleep 2; true
