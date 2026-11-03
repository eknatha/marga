pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
n=$(ls /srv/docs/*.txt 2>/dev/null | wc -l)
[ "$n" -eq 0 ] && pass "no .txt files are left" || fail "$n .txt files are still there"
n=$(ls /srv/docs/*.md 2>/dev/null | wc -l)
[ "$n" -eq 4 ] && pass "four .md files exist" || fail "found $n .md files, expected 4"
grep -q 'text of beta' /srv/docs/beta.md 2>/dev/null && pass "beta.md kept its text" || fail "beta.md lost its text"
[ -f /srv/docs/notes.log ] && pass "notes.log is untouched" || fail "notes.log was changed or removed"
