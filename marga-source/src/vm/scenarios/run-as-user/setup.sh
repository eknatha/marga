grep -q '^webapp:' /etc/passwd || echo 'webapp:x:1001:1001:web app:/home/webapp:/bin/sh' >> /etc/passwd
mkdir -p /home/webapp /usr/local/bin /run/webd; chown webapp /run/webd
printf '#!/bin/sh\nwhile :; do date > /run/webd/heartbeat; sleep 1; done\n' > /usr/local/bin/webd; chmod +x /usr/local/bin/webd
/usr/local/bin/webd >/dev/null 2>&1 &
