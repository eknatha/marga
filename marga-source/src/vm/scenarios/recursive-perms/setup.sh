grep -q '^www:' /etc/passwd || echo 'www:x:1004:1004:www:/srv/site:/bin/sh' >> /etc/passwd
mkdir -p /srv/site/css /srv/site/img
echo "<h1>shop</h1>" > /srv/site/index.html; echo "body{}" > /srv/site/css/app.css; echo png > /srv/site/img/logo.png
chown -R root:root /srv/site; find /srv/site -type d -exec chmod 700 {} \; ; find /srv/site -type f -exec chmod 600 {} \;
