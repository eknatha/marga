mkdir -p /srv/www /etc /usr/local/bin
echo "MARGA ok" > /srv/www/index.html
printf 'TARGET_HOST=127.0.0.1\nTARGET_PORT=8081\n' > /etc/monitor.conf
cat > /usr/local/bin/healthcheck <<'X'
#!/bin/sh
. /etc/monitor.conf
if wget -q -T 2 -O - "http://$TARGET_HOST:$TARGET_PORT/" 2>/dev/null | grep -q "MARGA ok"; then echo healthy; else echo "unhealthy: no answer on port $TARGET_PORT"; exit 1; fi
X
chmod +x /usr/local/bin/healthcheck
httpd -p 8080 -h /srv/www
