. /usr/lib/marga-pkg/tlslib.sh
tls_base shop.pem shop.key; tls_chain; tls_trust
sed -i "s#^KEY=.*#KEY=/etc/tls/shop-old.key#" /etc/shop-tls.conf
