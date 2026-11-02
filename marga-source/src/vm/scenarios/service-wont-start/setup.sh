mkdir -p /etc/web /srv/www /usr/local/bin
echo "MARGA web ok" > /srv/www/index.html
cat > /etc/web/web.conf <<'X'
# web server settings
PORT=8o80
ROOT=/srv/wwww
X
cat > /usr/local/bin/start-web <<'X'
#!/bin/sh
. /etc/web/web.conf
case "$PORT" in *[!0-9]*|"") echo "start-web: bad PORT '$PORT' in /etc/web/web.conf"; exit 1;; esac
[ -d "$ROOT" ] || { echo "start-web: ROOT '$ROOT' is not a directory"; exit 1; }
httpd -p "$PORT" -h "$ROOT" && echo "start-web: listening on $PORT"
X
chmod +x /usr/local/bin/start-web
