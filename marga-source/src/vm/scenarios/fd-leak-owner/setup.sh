mkdir -p /usr/local/bin
printf '#!/bin/sh\nexec 3</etc/passwd 4</etc/passwd 5</etc/passwd 6</etc/passwd 7</etc/passwd 8</etc/passwd 9</etc/passwd\nwhile :; do sleep 1; done\n' > /usr/local/bin/uploader
for n in thumbnailer mailer auditor; do printf '#!/bin/sh\nwhile :; do sleep 1; done\n' > /usr/local/bin/$n; done
chmod +x /usr/local/bin/uploader /usr/local/bin/thumbnailer /usr/local/bin/mailer /usr/local/bin/auditor
for n in uploader thumbnailer mailer auditor; do /usr/local/bin/$n >/dev/null 2>&1 & done
sleep 1
