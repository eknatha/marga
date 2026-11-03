. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg appd-lite 2.0.3 "" "Application daemon" <<'X'
/usr/bin/appd|appd 2.0.3
X
pk_pkg appd-lite 2.1.0 "" "Application daemon" <<'X'
/usr/bin/appd|appd 2.1.0
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1; apt install -y appd-lite >/dev/null 2>&1
