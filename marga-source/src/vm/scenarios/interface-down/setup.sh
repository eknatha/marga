mkdir -p /srv/www
echo "MARGA local ok" > /srv/www/index.html
httpd -p 8080 -h /srv/www
ifconfig lo down
