pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
t "DEBUG is false" "DEBUG is still true in /srv/app/.env" grep -qx 'DEBUG=false' /srv/app/.env
t "API_URL is still there" "API_URL was removed from the file" grep -q '^API_URL=http://localhost:9000$' /srv/app/.env
t "WORKERS is still there" "WORKERS was removed from the file" grep -qx 'WORKERS=4' /srv/app/.env
