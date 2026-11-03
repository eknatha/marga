. /usr/lib/marga-pkg/repolib.sh
pk_init
printf 'deb http://127.0.0.1:8090/ stable main\n' > /etc/apt/sources.list
pk_pkg ledger-tools 4.2.0 "" "Ledger command line tools" <<'X'
/usr/bin/ledgerctl|#!/bin/sh
X
pk_pkg ledgerctl-completion 4.2.0 "" "Shell completion for ledgerctl" <<'X'
/usr/share/bash-completion/completions/ledgerctl|# completion
X
pk_pkg ledger-docs 4.2.0 "" "Ledger documentation" <<'X'
/usr/share/doc/ledger/ledgerctl.txt|docs
X
pk_publish; pk_serve 8090; sleep 1
apt update >/dev/null 2>&1; apt install -y ledger-tools ledgerctl-completion ledger-docs >/dev/null 2>&1
