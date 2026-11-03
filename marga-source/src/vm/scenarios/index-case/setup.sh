mkdir -p /srv/shop
echo "Welcome to the shop" > /srv/shop/Index.html
httpd -p 8085 -h /srv/shop
