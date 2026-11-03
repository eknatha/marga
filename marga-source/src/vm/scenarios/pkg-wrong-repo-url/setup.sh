. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg curl-lite 8.5.0 "" "Fetch URLs" <<'X'
/usr/bin/curl-lite|#!/bin/sh
X
pk_publish; pk_serve 8090; sleep 1
sed -i 's/8090/8091/' /etc/apt/sources.list
