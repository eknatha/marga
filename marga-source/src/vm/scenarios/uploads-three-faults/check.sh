pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
out=$(su -s /bin/sh www -c /usr/local/bin/store-upload 2>&1); case "$out" in OK:*) pass "store-upload works as www ($out)";; *) fail "store-upload as www: $out";; esac
grep -q '^DIR=/srv/uploads/incoming$' /etc/uploader.conf && pass "the config points at /srv/uploads/incoming" || fail "the config does not point at /srv/uploads/incoming"
