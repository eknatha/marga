T=$(mktemp -d); mkdir -p $T/bin; echo 1.4 > $T/VERSION
printf '#!/bin/sh\necho "run $(cat /opt/app/VERSION)"\n' > $T/bin/run; chmod +x $T/bin/run
tar czf /root/release-1.4.tar.gz -C $T .; rm -rf $T
