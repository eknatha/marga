. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg libtls-lite 1.0.0 "" "TLS library" <<'X'
/usr/lib/libtls-lite.so|libtls-lite 1.0.0
X
pk_pkg libtls-lite 1.2.0 "" "TLS library (security fix)" <<'X'
/usr/lib/libtls-lite.so|libtls-lite 1.2.0
X
pk_pkg webapp-lite 3.0.0 "libtls-lite (>= 1.0)" "A small web application" <<'X'
/usr/bin/webapp-lite|#!/bin/sh
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1; apt install -y libtls-lite=1.0.0 webapp-lite >/dev/null 2>&1; apt-mark hold libtls-lite >/dev/null
