mkdir -p /opt/tools/bin /opt/job
printf '#!/bin/sh\necho "nightly ok"\n' > /opt/tools/bin/mytool; chmod +x /opt/tools/bin/mytool
printf '#!/bin/sh\nmytool\n' > /opt/job/nightly.sh; chmod +x /opt/job/nightly.sh
mkdir -p /root; export PATH=$PATH:/opt/tools/bin; echo 'export PATH=$PATH:/opt/tools/bin' > /root/.profile
