mkdir -p /srv/api /usr/local/bin
echo "api ok" > /srv/api/index.html
cat > /usr/local/bin/start-api <<'X'
#!/bin/sh
httpd -p 10.20.30.40:8090 -h /srv/api && echo "api listening on 10.20.30.40:8090"
X
chmod +x /usr/local/bin/start-api
start-api
