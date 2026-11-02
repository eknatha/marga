mkdir -p /run /srv/www /usr/local/bin
echo "MARGA web back" > /srv/www/index.html
echo 4242 > /run/web.pid
cat > /usr/local/bin/start-web <<'X'
#!/bin/sh
if [ -f /run/web.pid ]; then echo "start-web: already running (pid $(cat /run/web.pid)), refusing to start"; exit 1; fi
httpd -p 8080 -h /srv/www && pidof httpd | cut -d' ' -f1 > /run/web.pid && echo "start-web: started"
X
chmod +x /usr/local/bin/start-web
