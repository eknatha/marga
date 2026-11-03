mkdir -p /usr/local/bin
printf '#!/bin/sh\necho "report ready"\n' > /usr/local/bin/hello-report
chmod 644 /usr/local/bin/hello-report
