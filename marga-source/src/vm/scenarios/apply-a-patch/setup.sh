mkdir -p /etc/app /tmp/pa/a /tmp/pa/b
printf 'NAME=shop\nMAX_CONN=100\nLOG_LEVEL=debug\nREGION=ap-south-1\nTIMEOUT=30\n' > /etc/app/app.conf
cp /etc/app/app.conf /tmp/pa/a/app.conf
printf 'NAME=shop\nMAX_CONN=200\nLOG_LEVEL=warn\nREGION=ap-south-1\nTIMEOUT=30\n' > /tmp/pa/b/app.conf
( cd /tmp/pa && diff -u a/app.conf b/app.conf > /root/fix.patch ); rm -rf /tmp/pa; true
