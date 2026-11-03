mkdir -p /var/log
awk 'BEGIN{srand(14); n=split("203.0.113.9 203.0.113.9 203.0.113.9 198.51.100.23 198.51.100.23 198.51.100.23 192.0.2.77 192.0.2.77 192.0.2.77 10.1.2.3 10.9.9.9 172.16.4.4 8.8.4.4 1.1.1.1",ip," ");
 for(i=1;i<=70;i++){ a=ip[int(rand()*n)+1]; printf "Nov  2 10:%02d:%02d srv sshd[%d]: Failed password for root from %s port %d ssh2\n", int(i/2)%60, (i*7)%60, 1000+i, a, 40000+i }
 for(i=1;i<=6;i++) printf "Nov  2 11:%02d:00 srv sshd[%d]: Accepted password for deploy from 192.0.2.77 port %d ssh2\n", i, 2000+i, 50000+i}' | sort -k3,3 > /var/log/auth.log
