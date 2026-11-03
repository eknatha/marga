mkdir -p /usr/local/bin
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/batch-child
printf '#!/bin/sh\n/usr/local/bin/batch-child &\n/usr/local/bin/batch-child &\nwait\n' > /usr/local/bin/batch-parent
printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/api-server
chmod +x /usr/local/bin/batch-child /usr/local/bin/batch-parent /usr/local/bin/api-server
/usr/local/bin/api-server >/dev/null 2>&1 &
/usr/local/bin/batch-parent >/dev/null 2>&1 &
