ip link add d0 type dummy; ip addr add 10.5.0.1/24 dev d0; ip link set d0 up
ip route add blackhole 10.6.0.0/24
ip route add unreachable 10.7.0.0/24
ip route add prohibit 10.8.0.0/24
ip route add 10.9.0.0/24 dev d0
