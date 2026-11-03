. /usr/lib/marga-net/netlib.sh
mkns web
vlink h-w w-h web
inns web sh -c "ip addr add 10.0.3.20/24 dev w-h; ip link set w-h up"
serve web 8080 "storefront ok"
ip addr add 10.0.3.1/30 dev h-w; ip link set h-w up
sleep 1
