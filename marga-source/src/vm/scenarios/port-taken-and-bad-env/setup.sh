mkdir -p /srv/v1 /srv/v2 /usr/local/bin
echo "web v1" > /srv/v1/index.html; echo "web v2" > /srv/v2/index.html
echo 'APP_DB=db.old' > /etc/web.env
cat > /usr/local/bin/start-web <<'X'
#!/bin/sh
. /etc/web.env
httpd -p 8080 -h /srv/v2 || { echo "start-web: cannot listen on 8080" >&2; exit 1; }
echo "db=$APP_DB" > /run/web.status
echo "web v2 started"
X
chmod +x /usr/local/bin/start-web
httpd -p 8080 -h /srv/v1
