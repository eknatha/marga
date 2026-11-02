mkdir -p /var/data /usr/local/bin
mount -t tmpfs -o size=8m tmpfs /var/data
cat > /usr/local/bin/ingest <<'X'
#!/bin/sh
exec 3>/var/data/queue.dat
dd if=/dev/zero bs=1k count=7400 >&3 2>/dev/null
rm -f /var/data/queue.dat
touch /run/ingest.ready
while :; do sleep 5; done
X
chmod +x /usr/local/bin/ingest
/usr/local/bin/ingest >/dev/null 2>&1 &
n=0; while [ ! -f /run/ingest.ready ] && [ $n -lt 300 ]; do sleep 0.2; n=$((n+1)); done
