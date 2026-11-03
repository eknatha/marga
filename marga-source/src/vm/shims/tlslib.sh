# Helpers a TLS lab uses at boot. The certificates are made ahead of time (tools/mkcerts.sh); nothing here needs the internet.
F=/usr/share/marga-tls
tls_base() { # tls_base CERTFILE KEYFILE   (names inside /usr/share/marga-tls; the cert is installed as /etc/tls/shop.pem)
  rm -rf /etc/tls /usr/local/share/ca-certificates /root/lab-root-ca.pem /run/shop-tls.pid; mkdir -p /etc/tls /etc/ssl/certs /usr/local/share/ca-certificates /var/log
  cp $F/$1 /etc/tls/shop.pem; cp $F/$2 /etc/tls/shop.key; cp $F/shop.csr /etc/tls/shop.csr; cp $F/inter.pem $F/inter.key /etc/tls/; cp $F/shop-old.key /etc/tls/shop-old.key
  chmod 600 /etc/tls/*.key; : > /etc/tls/chain.pem
  printf 'PORT=8443\nCERT=/etc/tls/shop.pem\nKEY=/etc/tls/shop.key\nCHAIN=/etc/tls/chain.pem\nPROTOCOLS=\n' > /etc/shop-tls.conf
  grep -q shop.lab /etc/hosts || echo "127.0.0.1 shop.lab" >> /etc/hosts; }
tls_chain() { cp $F/inter.pem /etc/tls/chain.pem; }
tls_trust() { cp $F/ca.pem /usr/local/share/ca-certificates/lab-root-ca.crt; update-ca-certificates >/dev/null; }
tls_untrusted() { cp $F/ca.pem /root/lab-root-ca.pem; update-ca-certificates >/dev/null; }
tls_start() { shop-tls start >/dev/null 2>&1; }
# the client check every TLS lab uses
tls_client() { openssl s_client -connect 127.0.0.1:8443 -servername shop.lab -verify_hostname shop.lab -CAfile /etc/ssl/certs/ca-bundle.pem -verify_return_error -brief "$@" </dev/null 2>&1; }
