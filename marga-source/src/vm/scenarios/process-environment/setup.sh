mkdir -p /usr/local/bin /etc
echo 'DB_HOST=db-1.internal' > /etc/db-proxy.conf
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/db-proxy; chmod +x /usr/local/bin/db-proxy
DB_HOST=db-9.internal DB_PORT=5432 /usr/local/bin/db-proxy >/dev/null 2>&1 &
