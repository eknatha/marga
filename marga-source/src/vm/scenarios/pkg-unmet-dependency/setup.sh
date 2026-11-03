. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg libchart 1.4.0 "" "Charting library" <<'X'
/usr/lib/libchart.so|libchart 1.4.0
X
pk_pkg report-tool 2.0.0 "libchart (>= 2.0)" "Report builder" <<'X'
/usr/bin/report-tool|#!/bin/sh
X
pk_publish; pk_serve 8090
R=/srv/repo-bp; pk_init
pk_pkg libchart 2.1.0 "" "Charting library (backport)" <<'X'
/usr/lib/libchart.so|libchart 2.1.0
X
pk_publish; pk_serve 8092; R=/srv/repo; sleep 1
mkdir -p /etc/apt/sources.list.d; printf '# deb http://127.0.0.1:8092/ backports main\n' > /etc/apt/sources.list.d/backports.list
apt update >/dev/null 2>&1
