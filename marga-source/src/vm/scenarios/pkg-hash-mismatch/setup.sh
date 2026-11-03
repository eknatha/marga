. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg payd-lite 2.0.1 "" "Payment daemon" <<'X'
/usr/bin/payd-lite|original
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1
: > $R/Packages.new
pk_pkg payd-lite 2.0.1 "" "Payment daemon" <<'X'
/usr/bin/payd-lite|rebuilt
X
pk_publish
