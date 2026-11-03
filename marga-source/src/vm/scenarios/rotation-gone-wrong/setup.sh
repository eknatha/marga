mkdir -p /var/log/app /usr/local/bin
mount -t tmpfs -o size=2m tmpfs /var/log/app
cat > /usr/local/bin/app-logger <<'X'
#!/bin/sh
exec 3>>/var/log/app/app.log
trap 'exec 3>>/var/log/app/app.log' HUP
while :; do echo "$(date +%T) request handled" >&3; sleep 1; done
X
chmod +x /usr/local/bin/app-logger
/usr/local/bin/app-logger >/dev/null 2>&1 &
sleep 1
dd if=/dev/zero of=/var/log/app/app.log.2 bs=1k count=800 2>/dev/null; dd if=/dev/zero of=/var/log/app/app.log.3 bs=1k count=800 2>/dev/null
mv /var/log/app/app.log /var/log/app/app.log.1; : > /var/log/app/app.log
