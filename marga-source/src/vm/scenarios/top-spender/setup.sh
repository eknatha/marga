mkdir -p /srv/sales
printf '1,Asha\n2,Bharat\n3,Chitra\n4,Dev\n5,Esha\n' > /srv/sales/customers.csv
awk 'BEGIN{srand(21); for(i=1;i<=40;i++) printf "%d,%d,%d\n", 1000+i, int(rand()*5)+1, 10+int(rand()*190)}' > /srv/sales/orders.csv
