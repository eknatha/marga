mkdir -p /usr/local/bin /etc /run
printf 'app\ndb\n' > /etc/stack.order
cat > /usr/local/bin/svc-db <<'X'
#!/bin/sh
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/db-svc; chmod +x /usr/local/bin/db-svc
/usr/local/bin/db-svc >/dev/null 2>&1 &
touch /run/db.ready; echo "db started"
X
cat > /usr/local/bin/svc-app <<'X'
#!/bin/sh
[ -f /run/db.ready ] || { echo "app: database is not ready, refusing to start"; exit 1; }
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/app-svc; chmod +x /usr/local/bin/app-svc
/usr/local/bin/app-svc >/dev/null 2>&1 &
echo "app started"
X
cat > /usr/local/bin/stack-up <<'X'
#!/bin/sh
for s in $(cat /etc/stack.order); do /usr/local/bin/svc-$s || { echo "stack-up: $s failed"; exit 1; }; done
X
chmod +x /usr/local/bin/svc-db /usr/local/bin/svc-app /usr/local/bin/stack-up
rm -f /run/db.ready
