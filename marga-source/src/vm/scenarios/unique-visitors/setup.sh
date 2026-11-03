mkdir -p /srv/data
awk 'BEGIN{srand(5); n=split("asha ben chitra dev esha farid gita hari indu jay kavya lalit",a," "); for(i=1;i<=90;i++) print a[int(rand()*n)+1]}' > /srv/data/visitors.txt
