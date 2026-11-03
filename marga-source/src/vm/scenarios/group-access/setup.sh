grep -q '^maya:' /etc/passwd || echo 'maya:x:1002:1002:maya:/home/maya:/bin/sh' >> /etc/passwd
grep -q '^analysts:' /etc/group || echo 'analysts:x:2000:' >> /etc/group
mkdir -p /srv/reports /home/maya
echo "Q3 revenue 4.2M" > /srv/reports/q3.txt
chown root:analysts /srv/reports /srv/reports/q3.txt; chmod 770 /srv/reports; chmod 660 /srv/reports/q3.txt
