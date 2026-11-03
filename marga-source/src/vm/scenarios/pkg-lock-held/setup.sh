. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg jq-lite 1.7.0 "" "JSON tool" <<'X'
/usr/bin/jq-lite|#!/bin/sh
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1
printf '#!/bin/sh\nsleep 100000\n' > /usr/bin/unattended-upgrade; chmod +x /usr/bin/unattended-upgrade
setsid /usr/bin/unattended-upgrade >/dev/null 2>&1 &
echo $! > /var/lib/dpkg/lock-frontend
sleep 1
