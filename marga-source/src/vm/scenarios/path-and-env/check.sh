out=$(sh -lc 'deploytool' 2>&1)
case "$out" in *"ready for staging"*) echo "PASS a new login shell can run deploytool";; *) echo "FAIL a new login shell gets: $out";; esac
