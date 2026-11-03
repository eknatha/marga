mkdir -p /usr/local/bin
printf '#!/bin/sh\nx=$(head -c 12000000 /dev/zero | tr "\\000" x)\nwhile :; do sleep 1; done\n' > /usr/local/bin/report-builder
printf '#!/bin/sh\nx=$(head -c 3000000 /dev/zero | tr "\\000" x)\nwhile :; do sleep 1; done\n' > /usr/local/bin/cache-warmer
printf '#!/bin/sh\nx=small\nwhile :; do sleep 1; done\n' > /usr/local/bin/cron-mailer
chmod +x /usr/local/bin/report-builder /usr/local/bin/cache-warmer /usr/local/bin/cron-mailer
for n in report-builder cache-warmer cron-mailer; do /usr/local/bin/$n >/dev/null 2>&1 & done
sleep 3
