mkdir -p /srv/docs
for n in alpha beta gamma delta; do echo "text of $n" > /srv/docs/$n.txt; done
echo "keep me" > /srv/docs/notes.log
