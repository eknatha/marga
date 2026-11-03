. /usr/lib/marga-pkg/tlslib.sh
tls_base shop.pem shop.key; tls_chain; tls_trust
sed -i "s/^PROTOCOLS=.*/PROTOCOLS=tls1_2/" /etc/shop-tls.conf
tls_start
