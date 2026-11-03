mkdir -p /usr/local/bin /run
printf '#!/bin/sh\necho $$ > /run/etl.orig\nwhile :; do date +%%s > /run/etl.hb; sleep 1; done\n' > /usr/local/bin/etl-job
chmod +x /usr/local/bin/etl-job
/usr/local/bin/etl-job >/dev/null 2>&1 &
sleep 2
kill -STOP $(pidof etl-job)
