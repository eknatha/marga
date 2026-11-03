mkdir -p /var/lib/ghost /usr/local/bin
grep -q '^ghost:' /etc/passwd || echo 'ghost:x:1200:1200::/var/lib/ghost:/bin/sh' >> /etc/passwd
printf 'PORT=8088\r\n' > /etc/ghost.conf
echo 4242 > /run/ghost.lock
chown root:root /var/lib/ghost; chmod 755 /var/lib/ghost
cat > /usr/local/bin/ghost-app <<'X'
#!/bin/sh
echo "ok port=$PORT" > /var/lib/ghost/state || exit 1
while :; do sleep 1; done
X
cat > /usr/local/bin/start-ghost <<'X'
#!/bin/sh
[ -f /run/ghost.lock ] && { echo "start-ghost: lock file /run/ghost.lock exists" >&2; exit 1; }
PORT=$(sed -n 's/^PORT=//p' /etc/ghost.conf)
case "$PORT" in ''|*[!0-9]*) echo "start-ghost: invalid PORT in /etc/ghost.conf" >&2; exit 1;; esac
export PORT
su -s /bin/sh ghost -c "/usr/local/bin/ghost-app" >/dev/null 2>&1 &
sleep 1
pidof ghost-app >/dev/null || { echo "start-ghost: ghost-app exited, cannot write to /var/lib/ghost" >&2; exit 1; }
echo "ghost-app started"
X
chmod +x /usr/local/bin/ghost-app /usr/local/bin/start-ghost
