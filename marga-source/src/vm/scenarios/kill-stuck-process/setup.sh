mkdir -p /usr/local/bin
printf '#!/bin/sh\ntrap "" TERM\nwhile :; do sleep 1; done\n' > /usr/local/bin/stuck-job
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/web-heartbeat
chmod +x /usr/local/bin/stuck-job /usr/local/bin/web-heartbeat
/usr/local/bin/stuck-job >/dev/null 2>&1 &
/usr/local/bin/web-heartbeat >/dev/null 2>&1 &
