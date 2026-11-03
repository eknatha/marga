mkdir -p /var/sessions
mount -t tmpfs -o size=4m,nr_inodes=100 tmpfs /var/sessions
echo active > /var/sessions/current-session
i=0; while touch /var/sessions/sess-$i 2>/dev/null; do i=$((i+1)); done
