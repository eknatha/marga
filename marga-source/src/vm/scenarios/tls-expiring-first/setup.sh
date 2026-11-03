. /usr/lib/marga-pkg/tlslib.sh
mkdir -p /etc/tls/sites
for n in alpha beta gamma; do cp /usr/share/marga-tls/site-$n.pem /etc/tls/sites/; done
