pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
sh=$(awk -F: '$1=="svc-backup"{print $7}' /etc/passwd)
case "$sh" in /bin/false|/sbin/nologin|/usr/sbin/nologin|/bin/nologin) pass "svc-backup cannot log in (shell $sh)";; *) fail "svc-backup shell is '$sh'";; esac
awk -F: '$1=="svc-backup"{exit !($3==997 && $6=="/var/backups")}' /etc/passwd && pass "uid and home are unchanged" || fail "the uid or home of svc-backup changed"
awk -F: '$1=="root"{exit !($7=="/bin/sh")}' /etc/passwd && pass "root keeps /bin/sh" || fail "root's shell was changed"
