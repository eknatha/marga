sleep 3
u=$(df -k /var/log/app | awk 'NR==2{gsub("%","",$5);print $5}')
[ "$u" -lt 50 ] && echo "PASS /var/log/app is under 50 percent full ($u%)" || echo "FAIL /var/log/app is still $u% full"
ps | grep -q '[a]pp-writer' && echo "PASS app-writer is still running" || echo "FAIL app-writer was stopped"
[ -s /var/log/app/heartbeat.log ] && echo "PASS heartbeat.log is being written" || echo "FAIL heartbeat.log is empty or missing"
