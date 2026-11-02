grep -q '^deploy:' /etc/passwd || echo 'deploy:x:1000:1000:deploy:/home/deploy:/bin/sh' >> /etc/passwd
mkdir -p /home/deploy /srv/app
cat > /srv/app/run.sh <<'X'
#!/bin/sh
echo "release published"
X
chmod 644 /srv/app/run.sh
chmod 700 /srv/app
chown root:root /srv/app /srv/app/run.sh
