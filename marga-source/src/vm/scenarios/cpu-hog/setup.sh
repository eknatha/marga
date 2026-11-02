mkdir -p /usr/local/bin
cat > /usr/local/bin/report-job <<'X'
#!/bin/sh
while :; do yes > /dev/null & renice -n 10 -p $! >/dev/null 2>&1; wait; done
X
cat > /usr/local/bin/api-server <<'X'
#!/bin/sh
while :; do sleep 1; done
X
chmod +x /usr/local/bin/report-job /usr/local/bin/api-server
/usr/local/bin/api-server >/dev/null 2>&1 &
/usr/local/bin/report-job >/dev/null 2>&1 &
