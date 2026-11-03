mkdir -p /var/log/svc /usr/local/bin
i=1; while [ $i -le 300 ]; do echo "line $i OLDLINE-$i"; i=$((i+1)); done > /var/log/svc/app.log
cat > /usr/local/bin/app-logger <<'X'
#!/bin/sh
while :; do echo "$(date +%T) tick" >> /var/log/svc/app.log; sleep 1; done
X
chmod +x /usr/local/bin/app-logger
/usr/local/bin/app-logger >/dev/null 2>&1 &
