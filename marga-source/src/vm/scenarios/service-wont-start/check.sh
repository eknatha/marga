sleep 1
out=$(wget -q -T 3 -O - http://127.0.0.1:8080/ 2>/dev/null)
case "$out" in *"MARGA web ok"*) echo "PASS the web server answers on port 8080";; *) echo "FAIL nothing useful answers on http://127.0.0.1:8080/";; esac
grep -q '^PORT=8080$' /etc/web/web.conf && echo "PASS PORT is 8080 in web.conf" || echo "FAIL PORT in /etc/web/web.conf is not 8080"
