#!/bin/sh
# Builds the test certificates the TLS labs use (src/vm/fixtures/tls). Needs the host openssl. Run once; the files are committed.
set -eu
cd "$(dirname "$0")/.."
O=src/vm/fixtures/tls; rm -rf $O; mkdir -p $O; T=$(mktemp -d)
ek() { openssl ecparam -name prime256v1 -genkey -noout -out "$1" 2>/dev/null; }
cat > $T/ca.cnf <<CNF
[ca]
default_ca = CA_default
[CA_default]
dir = $T
database = $T/index.txt
new_certs_dir = $T
serial = $T/serial
default_md = sha256
policy = pol
unique_subject = no
copy_extensions = copy
[pol]
commonName = supplied
[ext_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
[ext_leaf]
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = serverAuth
CNF
: > $T/index.txt; echo 1000 > $T/serial
# root and issuing CA
ek $O/ca.key; openssl req -x509 -new -key $O/ca.key -subj "/O=MARGA Lab/CN=MARGA Lab Root CA" -days 36500 -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" -out $O/ca.pem
ek $O/inter.key; openssl req -new -key $O/inter.key -subj "/O=MARGA Lab/CN=MARGA Lab Issuing CA" -out $T/inter.csr
openssl ca -batch -config $T/ca.cnf -cert $O/ca.pem -keyfile $O/ca.key -in $T/inter.csr -out $O/inter.pem -days 36000 -extensions ext_ca -notext 2>/dev/null
# a public-looking root that is NOT the lab CA (the base of the trust bundle)
ek $T/pub.key; openssl req -x509 -new -key $T/pub.key -subj "/O=Example Public Trust/CN=Example Public Root R1" -days 36500 -out $O/public-roots.pem
leaf() { # leaf NAME CN SAN START END  [KEY]
  k=${6:-$O/$1.key}; [ -f "$k" ] || ek "$k"
  openssl req -new -key "$k" -subj "/O=MARGA Lab/CN=$2" ${3:+-addext "subjectAltName=$3"} -out $T/$1.csr
  if [ -n "$3" ]; then ec=ext_leaf; else ec=ext_leaf; fi
  openssl ca -batch -config $T/ca.cnf -cert $O/inter.pem -keyfile $O/inter.key -in $T/$1.csr -out $O/$1.pem -startdate "$4" -enddate "$5" -extensions $ec -notext 2>/dev/null
}
cp $T/shop.csr /dev/null 2>&1 || true
leaf shop shop.lab "DNS:shop.lab" 20240101000000Z 21260101000000Z
cp $T/shop.csr $O/shop.csr
leaf shop-expired shop.lab "DNS:shop.lab" 20200101000000Z 20200401000000Z $O/shop.key
leaf shop-nosan shop.lab "" 20240101000000Z 21260101000000Z $O/shop.key
leaf shop-wronghost shop.lab "DNS:www.shop.lab" 20240101000000Z 21260101000000Z $O/shop.key
ek $O/shop-old.key
leaf shop-oldkey shop.lab "DNS:shop.lab" 20240101000000Z 21260101000000Z $O/shop-old.key
for s in alpha:20270301000000Z beta:20261215000000Z gamma:20270930000000Z; do n=${s%%:*}; e=${s#*:}; leaf site-$n $n.lab "DNS:$n.lab" 20260101000000Z $e; done
rm -f $O/site-*.key $O/shop-oldkey.key 2>/dev/null; mv $O/shop-old.key $O/shop-old.key.keep 2>/dev/null; mv $O/shop-old.key.keep $O/shop-old.key
rm -rf $T; ls -la $O
