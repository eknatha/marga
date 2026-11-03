mkdir -p /usr/local/bin
cat > /usr/local/bin/fetch-all <<'X'
#!/bin/sh
D=/run/fetch; rm -rf $D; mkdir -p $D
for n in 1 2 3; do ( sleep $n; echo "part $n" > $D/part-$n ) & done
cat $D/part-* 2>/dev/null > /run/fetch.summary
echo "fetched $(wc -l < /run/fetch.summary | tr -d ' ') parts"
X
chmod +x /usr/local/bin/fetch-all
