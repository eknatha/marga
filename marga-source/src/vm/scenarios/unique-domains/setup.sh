mkdir -p /srv/data
awk 'BEGIN{srand(8); n=split("gmail.com yahoo.com outlook.com proton.me corp.example iitm.ac.in zoho.com",d," "); m=split("asha ben chitra dev esha farid gita",u," ");
 for(i=1;i<=60;i++) printf "2026-10-%02d signup via referral from friend@%s email=%s@%s plan=%s\n", (i%28)+1, d[int(rand()*3)+1], u[int(rand()*m)+1], d[int(rand()*n)+1], (rand()>0.5?"pro":"free")}' > /srv/data/signups.txt
