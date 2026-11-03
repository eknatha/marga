mkdir -p /opt/app /run
printf '#!/bin/bash\r\necho "deployed v42" > /run/deploy.out\r\n' > /opt/app/deploy.sh
chmod 644 /opt/app/deploy.sh; rm -f /run/deploy.out
