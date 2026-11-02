sleep 1
out=$(wget -q -T 3 -O - http://127.0.0.1:8080/ 2>/dev/null)
case "$out" in *"MARGA web v2"*) echo "PASS port 8080 now serves the new site";; *"retired"*) echo "FAIL port 8080 still serves the old site";; *) echo "FAIL nothing answers on port 8080";; esac
