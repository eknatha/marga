mkdir -p /var/spool/q /usr/local/bin
rm -f /var/spool/q/flushed
cat > /usr/local/bin/queue-worker <<'X'
#!/bin/sh
trap 'echo "40 messages flushed" > /var/spool/q/flushed; exit 0' TERM
while :; do sleep 1; done
X
chmod +x /usr/local/bin/queue-worker
/usr/local/bin/queue-worker >/dev/null 2>&1 &
