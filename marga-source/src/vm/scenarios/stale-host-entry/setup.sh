mkdir -p /srv/api /usr/local/bin
echo "api ok" > /srv/api/index.html
httpd -p 8081 -h /srv/api
printf '127.0.0.1 localhost\n10.1.1.5 api.internal\n127.0.0.2 api.internal\n' > /etc/hosts
cat > /usr/local/bin/api-check <<'X'
#!/bin/sh
ip=$(awk '$2=="api.internal"{print $1; exit}' /etc/hosts)
[ -n "$ip" ] || { echo "api.internal is not in /etc/hosts"; exit 1; }
out=$(wget -q -T 2 -O - "http://$ip:8081/" 2>/dev/null)
if [ "$out" = "api ok" ]; then echo "api ok"; else echo "api-check: no answer from $ip"; exit 1; fi
X
chmod +x /usr/local/bin/api-check
