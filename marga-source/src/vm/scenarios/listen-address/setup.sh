mkdir -p /srv/public
echo "public site" > /srv/public/index.html
httpd -p 127.0.0.1:8095 -h /srv/public
