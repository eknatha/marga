grep -q '^users:' /etc/group || echo 'users:x:100:' >> /etc/group
grep -q '^devs:' /etc/group || echo 'devs:x:2100:alice' >> /etc/group
grep -q '^alice:' /etc/passwd || echo 'alice:x:1003:100:alice:/home/alice:/bin/sh' >> /etc/passwd
mkdir -p /srv/proj /home/alice; chown root:devs /srv/proj; chmod 775 /srv/proj
