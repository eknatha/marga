grep -q '^deploy:' /etc/group || echo 'deploy:x:1000:' >> /etc/group
grep -q '^deploy:' /etc/passwd || echo 'deploy:x:1000:1000:deploy:/home/deploy:/bin/sh' >> /etc/passwd
mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAAC3Nza deploy@laptop" > /home/deploy/.ssh/authorized_keys
chown root:root /home/deploy/.ssh /home/deploy/.ssh/authorized_keys; chmod 777 /home/deploy/.ssh; chmod 666 /home/deploy/.ssh/authorized_keys
