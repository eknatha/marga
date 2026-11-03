. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg nginx-lite 1.24.0 "" "Small web server" <<'X'
/usr/sbin/nginx-lite|#!/bin/sh
/usr/share/doc/nginx-lite/README|nginx-lite 1.24.0
X
pk_publish; pk_serve 8090; sleep 1
