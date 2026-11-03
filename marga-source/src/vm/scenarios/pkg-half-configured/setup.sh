. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
POSTINST='[ -d /var/spool/queue ] || { echo "queue-lite: /var/spool/queue is missing"; exit 1; }
echo configured > /var/lib/queue-lite.state' pk_pkg queue-lite 1.0.0 "" "A small job queue" <<'X'
/usr/bin/queue-lite|#!/bin/sh
X
pk_pkg other-tool 1.0.0 "" "Another tool" <<'X'
/usr/bin/other-tool|#!/bin/sh
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1; apt install -y queue-lite >/dev/null 2>&1
