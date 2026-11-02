mkdir -p /var/log/app /usr/local/bin
mount -t tmpfs -o size=8m tmpfs /var/log/app
dd if=/dev/zero of=/var/log/app/app.log bs=1k count=7200 2>/dev/null
dd if=/dev/zero of=/var/log/app/debug.trace bs=1k count=700 2>/dev/null
cat > /usr/local/bin/app-writer <<'X'
#!/bin/sh
while :; do date >> /var/log/app/heartbeat.log 2>/dev/null; sleep 2; done
X
chmod +x /usr/local/bin/app-writer
/usr/local/bin/app-writer >/dev/null 2>&1 &
