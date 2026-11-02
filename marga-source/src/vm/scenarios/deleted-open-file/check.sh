u=$(df -k /var/data | awk 'NR==2{gsub("%","",$5);print $5}')
[ "$u" -lt 60 ] && echo "PASS /var/data is under 60 percent full ($u%)" || echo "FAIL /var/data is still $u% full although no file is listed"
ps | grep -q '[i]ngest' && echo "PASS the ingest process is still running" || echo "FAIL ingest is not running, restart it with /usr/local/bin/ingest after freeing the space"
