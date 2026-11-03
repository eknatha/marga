pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; }
t() { d=$1; f=$2; shift 2; if "$@" >/dev/null 2>&1; then echo "PASS $d"; else echo "FAIL $f"; fi; }
touch /run/build.fail
out=$(/usr/local/bin/deploy 2>&1); rc=$?
rm -f /run/build.fail
case "$out" in *"deploy OK"*) fail "deploy says OK although the build failed";; *) pass "deploy does not say OK after a failed build";; esac
[ $rc -ne 0 ] && pass "deploy exits with an error ($rc)" || fail "deploy exits with 0 after a failed build"
out=$(/usr/local/bin/deploy 2>&1)
[ "$out" = "$(printf 'uploading artifact\ndeploy OK')" ] && pass "a good build still deploys" || fail "a good build no longer deploys"
