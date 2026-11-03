. /usr/lib/marga-net/netlib.sh
mkns web; mkns db
vlink p-web w-eth web
vlink p-db d-eth db
brctl addbr br0; ip link set br0 up
brctl addif br0 p-web
ip link set p-web up; ip link set p-db up
inns web sh -c "ip addr add 10.0.9.2/24 dev w-eth; ip link set w-eth up"
inns db sh -c "ip addr add 10.0.9.3/24 dev d-eth; ip link set d-eth up"
sleep 1
