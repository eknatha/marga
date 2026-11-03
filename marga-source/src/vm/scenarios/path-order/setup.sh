mkdir -p /usr/local/bin /opt/deploy/bin /root
printf '#!/bin/sh\necho "deploytool 1.0"\n' > /usr/local/bin/deploytool
printf '#!/bin/sh\necho "deploytool 2.0"\n' > /opt/deploy/bin/deploytool
chmod +x /usr/local/bin/deploytool /opt/deploy/bin/deploytool
echo 'export PATH=$PATH:/opt/deploy/bin' > /root/.profile
