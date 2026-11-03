mkdir -p /usr/local/bin /opt/tools
printf '#!/bin/sh\necho helper\n' > /usr/local/bin/backup-helper; printf '#!/bin/sh\necho scan\n' > /opt/tools/scan
chmod 4755 /usr/local/bin/backup-helper; chmod 6755 /opt/tools/scan
