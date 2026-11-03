pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ -x /usr/local/bin/backup-site.sh ] && pass "the script is executable" || fail "the script is not executable"
rm -f /backup/daily/site-*.tar.gz 2>/dev/null
env -i /bin/sh /usr/local/bin/backup-site.sh >/dev/null 2>&1
f=$(ls /backup/daily/site-*.tar.gz 2>/dev/null | head -1); [ -n "$f" ] && tar tzf "$f" 2>/dev/null | grep -q 'index.html' && pass "a new archive contains index.html" || fail "running the script does not produce an archive with index.html"
