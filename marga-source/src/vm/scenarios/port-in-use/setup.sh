mkdir -p /srv/www /srv/old /usr/local/bin /etc/web
echo "old site, retired" > /srv/old/index.html
echo "MARGA web v2" > /srv/www/index.html
printf 'PORT=8080\nROOT=/srv/www\n' > /etc/web/web.conf
cat > /usr/local/bin/start-web <<'X'
#!/bin/sh
. /etc/web/web.conf
httpd -p "$PORT" -h "$ROOT" && echo "start-web: listening on $PORT"
X
chmod +x /usr/local/bin/start-web
httpd -p 8080 -h /srv/old
