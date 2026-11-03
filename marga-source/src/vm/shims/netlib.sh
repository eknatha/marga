# Helpers for building small networks in scenario setup scripts. Each namespace is held open by a sleeping process.
mkdir -p /run/ns
mkns() { unshare -n sleep 1000000 >/dev/null 2>&1 & echo $! > "/run/ns/$1.pid"; sleep 0.3; inns "$1" ip link set lo up; }
# vlink HOSTNAME NSNAME NS  creates a veth pair; one end named HOSTNAME stays here, the other named NSNAME moves into namespace NS
vlink() {
  before=$(ls /sys/class/net); ip link add "$1" type veth; after=$(ls /sys/class/net)
  peer=""; for d in $after; do case " $before " in *" $d "*) ;; *) [ "$d" != "$1" ] && peer=$d;; esac; done
  ip link set "$peer" name "$2" 2>/dev/null || true
  ip link set "$2" netns "$(cat /run/ns/$3.pid)"
}
# nslink NS1 IF1 NS2 IF2 creates a veth between two namespaces
nslink() {
  vlink "t-$2" "$4" "$3"; ip link set "t-$2" name "$2"; ip link set "$2" netns "$(cat /run/ns/$1.pid)"
}
# serve NS PORT MESSAGE [BINDADDR]   a tiny web service inside a namespace that answers MESSAGE
serve() { mkdir -p "/srv/ns-$1-$2"; echo "$3" > "/srv/ns-$1-$2/index.html"; inns "$1" httpd -f -p "${4:-0.0.0.0}:$2" -h "/srv/ns-$1-$2" >/dev/null 2>&1 & }
# reach IP PORT   prints what the service answers (empty on failure)
reach() { wget -q -T 2 -O - "http://$1:$2/" 2>/dev/null; }
