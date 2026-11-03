mkdir -p /srv/a /srv/b /usr/local/bin
echo "service A" > /srv/a/index.html; echo "service B" > /srv/b/index.html
echo PORT=8080 > /etc/svc-a.conf; echo PORT=8080 > /etc/svc-b.conf
for s in a b; do cat > /usr/local/bin/start-$s <<X
#!/bin/sh
. /etc/svc-$s.conf
httpd -p "\$PORT" -h /srv/$s && echo "service $s listening on \$PORT"
X
chmod +x /usr/local/bin/start-$s; done
start-a; start-b
