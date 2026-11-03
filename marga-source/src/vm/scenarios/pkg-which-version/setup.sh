. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg mailq-lite 3.1.0 "" "Mail queue viewer" <<'X'
/usr/bin/mailq-lite|3.1.0
X
pk_publish; pk_serve 8090
R=/srv/repo-up; pk_init
pk_pkg mailq-lite 3.2.1 "" "Mail queue viewer (updates)" <<'X'
/usr/bin/mailq-lite|3.2.1
X
pk_publish; pk_serve 8093; R=/srv/repo; sleep 1
printf 'deb http://127.0.0.1:8093/ updates main\n' > /etc/apt/sources.list.d/updates.list 2>/dev/null || { mkdir -p /etc/apt/sources.list.d; printf 'deb http://127.0.0.1:8093/ updates main\n' > /etc/apt/sources.list.d/updates.list; }
apt update >/dev/null 2>&1
rm -f /var/lib/dpkg/lock-frontend
apt install -y mailq-lite=3.1.0 >/dev/null 2>&1
