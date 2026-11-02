sleep 1
out=$(wget -q -T 3 -O - http://127.0.0.1:8080/ 2>/dev/null)
case "$out" in *"MARGA web back"*) echo "PASS the web server is running";; *) echo "FAIL the web server is not answering on 8080";; esac
p=$(cat /run/web.pid 2>/dev/null); [ -n "$p" ] && [ -d "/proc/$p" ] && echo "PASS the pidfile points to a live process" || echo "FAIL the pidfile is missing or stale"
