cat > /var/log/auth.log <<'X'
Nov  1 09:12:01 marga-lab sudo:     maya : TTY=pts/0 ; PWD=/home/maya ; USER=root ; COMMAND=/bin/systemctl restart nginx
Nov  1 09:40:17 marga-lab sudo:   deploy : TTY=pts/1 ; PWD=/srv ; USER=root ; COMMAND=/bin/ls /srv/data
Nov  1 10:03:44 marga-lab sudo:     ravi : TTY=pts/2 ; PWD=/var/log ; USER=root ; COMMAND=/usr/bin/tail -n 50 syslog
Nov  1 11:21:09 marga-lab sudo:   deploy : TTY=pts/1 ; PWD=/srv ; USER=root ; COMMAND=/bin/rm -rf /srv/data
Nov  1 11:25:31 marga-lab sudo:     maya : TTY=pts/0 ; PWD=/srv ; USER=root ; COMMAND=/bin/ls /srv
Nov  1 14:02:12 marga-lab sudo:     ravi : TTY=pts/2 ; PWD=/home/ravi ; USER=root ; COMMAND=/bin/cat /etc/hosts
X
