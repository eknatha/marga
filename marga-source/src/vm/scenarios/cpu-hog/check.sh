sleep 2
ps | grep -q '[r]eport-job' && echo "FAIL report-job is still running" || echo "PASS report-job is stopped"
ps | grep -E '\{yes\}|[ /]yes( |$)' | grep -vq grep && echo "FAIL a yes process is still burning CPU" || echo "PASS nothing is burning CPU"
ps | grep -q '[a]pi-server' && echo "PASS api-server is still running" || echo "FAIL api-server was stopped"
