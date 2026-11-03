mkdir -p /usr/local/bin
printf '#!/bin/sh\nwhile :; do :; done\n' > /usr/local/bin/batch-crunch
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/api-server
chmod +x /usr/local/bin/batch-crunch /usr/local/bin/api-server
/usr/local/bin/api-server >/dev/null 2>&1 &
/usr/local/bin/batch-crunch >/dev/null 2>&1 &
