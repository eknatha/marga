mkdir -p /srv/src/conf
echo "secret" > /srv/src/secret.key; printf '#!/bin/sh\necho run\n' > /srv/src/run.sh; echo "port=80" > /srv/src/conf/app.conf
chmod 600 /srv/src/secret.key; chmod 755 /srv/src/run.sh
ln -s run.sh /srv/src/latest
chown 1001:1001 /srv/src/conf/app.conf /srv/src/secret.key
touch -d "@1700000000" /srv/src/conf/app.conf /srv/src/secret.key /srv/src/run.sh
rm -rf /srv/dst
