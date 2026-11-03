. /usr/lib/marga-net/netlib.sh
mkns web
vlink h-w w-h web
inns web sh -c "ip addr add 10.0.3.20/24 dev w-h; ip link set w-h up"
ip addr add 10.0.3.1/24 dev h-w; ip link set h-w up
mkdir -p /srv/web /usr/local/bin; echo "storefront ok" > /srv/web/index.html
cat > /usr/local/bin/start-web <<'X'
#!/bin/sh
BIND=127.0.0.1
. /usr/lib/marga-net/netlib.sh
inns web httpd -p $BIND:8080 -h /srv/web
X
chmod +x /usr/local/bin/start-web
start-web; sleep 1
