grep -q '^webapp:' /etc/passwd || echo 'webapp:x:1001:1001:web app:/home/webapp:/bin/sh' >> /etc/passwd
mkdir -p /srv/uploads /home/webapp
chown root:root /srv/uploads; chmod 755 /srv/uploads
