mkdir -p /var/log/app /usr/local/bin
mount -t tmpfs -o size=1m tmpfs /var/log/app
dd if=/dev/zero of=/var/log/app/dump.tmp bs=1k count=900 2>/dev/null
echo 99999 > /run/app-writer.pid
cat > /usr/local/bin/app-writer <<'X'
#!/bin/sh
while :; do date >> /var/log/app/heartbeat.log || exit 1; sleep 1; done
X
cat > /usr/local/bin/start-writer <<'X'
#!/bin/sh
if [ -f /run/app-writer.pid ]; then echo "app-writer already running (pidfile /run/app-writer.pid)"; exit 1; fi
/usr/local/bin/app-writer >/dev/null 2>&1 &
echo $! > /run/app-writer.pid
X
chmod +x /usr/local/bin/app-writer /usr/local/bin/start-writer
