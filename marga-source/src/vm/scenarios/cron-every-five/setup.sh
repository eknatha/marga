mkdir -p /var/spool/cron/crontabs /usr/local/bin
printf '#!/bin/sh\necho backup >> /var/log/backup.log\n' > /usr/local/bin/backup; chmod +x /usr/local/bin/backup
echo '0 * * * * /usr/local/bin/backup' > /var/spool/cron/crontabs/root
