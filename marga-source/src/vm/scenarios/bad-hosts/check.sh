out=$(db-check 2>&1)
case "$out" in *"db.internal is 127.0.0.2"*) echo "PASS db.internal resolves to 127.0.0.2";; *) echo "FAIL db-check says: $out";; esac
grep -q 'localhost' /etc/hosts && echo "PASS localhost is still in /etc/hosts" || echo "FAIL localhost was removed from /etc/hosts"
