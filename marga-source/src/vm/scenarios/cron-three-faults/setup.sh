mkdir -p /usr/local/bin /var/spool/cron/crontabs
printf '#!/bin/sh\ndate > /run/clean.done\n' > /usr/local/bin/nightly-clean.sh; chmod 644 /usr/local/bin/nightly-clean.sh
echo '*/5 * * * * nightly-clean.sh' | crontab - 2>/dev/null
kill $(pidof crond) 2>/dev/null; true
