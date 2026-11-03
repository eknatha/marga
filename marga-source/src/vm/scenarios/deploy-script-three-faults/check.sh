pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
[ -x /opt/app/deploy.sh ] && pass "the script is executable" || fail "the script is not executable"
grep -q "$(printf '\r')" /opt/app/deploy.sh && fail "the script still has Windows line endings" || pass "no Windows line endings"
sh=$(head -1 /opt/app/deploy.sh | sed 's/^#!//; s/ .*//'); [ -x "$sh" ] && pass "the interpreter $sh exists" || fail "the interpreter named in line 1 does not exist"
rm -f /run/deploy.out; /opt/app/deploy.sh >/dev/null 2>&1; grep -q 'deployed v42' /run/deploy.out 2>/dev/null && pass "the script runs and writes the result" || fail "running the script does not write the result"
