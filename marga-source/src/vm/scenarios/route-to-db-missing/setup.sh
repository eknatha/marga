. /usr/lib/marga-net/netlib.sh
mkns router; mkns db
vlink h-r r-h router
nslink router r-d db d-r
ip addr add 10.0.1.1/24 dev h-r; ip link set h-r up
inns router sh -c "ip addr add 10.0.1.254/24 dev r-h; ip link set r-h up; ip addr add 10.0.2.254/24 dev r-d; ip link set r-d up; echo 1 > /proc/sys/net/ipv4/ip_forward"
inns db sh -c "ip addr add 10.0.2.10/24 dev d-r; ip link set d-r up; ip route add default via 10.0.2.254"
serve db 5432 "orders-db ready"
sleep 1
