mkdir -p /mnt/data /usr/local/bin
mount -t tmpfs -o size=1m tmpfs /mnt/data
printf '#!/bin/sh\ncd /mnt/data\nwhile :; do sleep 1; done\n' > /usr/local/bin/nightly-report
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/api-server
chmod +x /usr/local/bin/nightly-report /usr/local/bin/api-server
/usr/local/bin/api-server >/dev/null 2>&1 &
/usr/local/bin/nightly-report >/dev/null 2>&1 &
