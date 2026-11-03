/* MARGA "Explain this output": a fixed table of rules that reads the last command and its output in the simulated terminal.
   No AI and no network. It names what each part means and what to look at next. */
window.MargaExplain = (function () {
'use strict';
var BY_CMD = {
  ls: function (c, o) { return /^total \d+|^[-dl][rwx-]{9}/m.test(o) ? ['Each row is one file. The first column is the type and permissions: d is a directory, - a file, l a link, then owner, group and other (r read, w write, x run).', 'Next come the hard link count, the owner, the group, the size in bytes, the modified time and the name.'] : ['ls lists names only. Add -l for owner, size and permissions, and -a to show names that start with a dot.']; },
  df: function () { return ['Each row is a filesystem. Size, Used and Avail are space. Use% is the one to watch: near 100% a service fails writing logs or files.', 'Mounted on says where it appears. Next: du -sh /var/* to find what fills it, or df -i if space looks free but writes fail (inodes).']; },
  du: function () { return ['Each row is a size followed by a path. With -s it is one total per argument; with -h sizes read as K, M, G.', 'Sort with: du -sh * | sort -h to see the biggest last.']; },
  ps: function () { return ['Each row is a process. PID is its number, the user is its owner, %CPU and %MEM show load, STAT is its state (S sleeping, R running, Z zombie, D waiting on disk) and the last column is the command.']; },
  ss: function () { return ['Each row is a socket. LISTEN rows are services waiting for connections. Local Address:Port is where it listens: 0.0.0.0 means every interface, 127.0.0.1 means this machine only.', 'If a service cannot be reached from outside, check whether it listens on 127.0.0.1 only.']; },
  systemctl: function (c, o) { return /Active: failed|failed/.test(o) ? ['The unit is in a failed state. Read the Main PID line for the exit code and the log lines under it.', 'Next: journalctl -u NAME -n 50 for the full reason, then fix the cause before restarting.'] : /Active: active/.test(o) ? ['Active: active (running) means the service is up. Loaded shows the unit file and whether it starts at boot (enabled).'] : ['systemctl reports unit state. status shows details, is-active gives a one-word answer, list-units lists everything.']; },
  journalctl: function () { return ['Each line is a log entry: time, host, the program name and its PID, then the message. Read from the bottom (newest) upward and look for the first line that says error, failed or denied.']; },
  grep: function () { return ['grep prints the lines that match. With -n it adds line numbers, -i ignores case, -r searches folders, -v shows lines that do not match. No output with exit status 1 means nothing matched.']; },
  curl: function (c, o) { return /HTTP\/[\d.]+ 4\d\d|403|404/.test(o) ? ['A 4xx status means the server answered but refused the request: 401 needs credentials, 403 is forbidden, 404 is not found.'] : /HTTP\/[\d.]+ 5\d\d|50[0-9]/.test(o) ? ['A 5xx status means the server failed. Look at the server log, not the client.'] : /Could not resolve|Connection refused|timed out/i.test(o) ? ['No answer from the server. "Could not resolve" is DNS, "Connection refused" is nothing listening on that port, "timed out" is usually a firewall dropping packets.'] : ['curl shows the response body. Add -I for headers only, -v to see each step of the connection.']; },
  kubectl: function (c, o) { return /CrashLoopBackOff/.test(o) ? ['CrashLoopBackOff means the container starts, exits, and Kubernetes keeps retrying with longer waits. Read the reason with: kubectl logs POD --previous and kubectl describe pod POD.'] : /ImagePullBackOff|ErrImagePull/.test(o) ? ['The node cannot pull the image: a wrong name or tag, a private registry without a pull secret, or no network. kubectl describe pod shows the exact error in Events.'] : /Pending/.test(o) ? ['Pending means no node accepted the pod yet. kubectl describe pod lists why under Events: not enough CPU or memory, a taint, or an unbound volume.'] : /NAME +READY +STATUS/.test(o) ? ['READY is containers running over containers in the pod. STATUS is the pod phase. RESTARTS counts how many times a container restarted; a rising number is a sign of trouble.'] : ['kubectl get lists objects, describe explains one in detail, logs shows a container\'s output.']; },
  docker: function () { return ['docker ps lists running containers (add -a for stopped ones). STATUS shows how long a container has been up or when it exited and with which code. Exited (1) or higher means an error: read docker logs NAME.']; },
  aws: function () { return ['The output is JSON by default. --query selects part of it, --output table or text changes the form. An AccessDenied error names the action and the identity: that is a missing permission, not a missing resource.']; },
  az: function () { return ['The output is JSON by default. --query selects part of it and -o table makes it readable. Check which subscription is active with: az account show.']; },
  ping: function () { return ['Each line is one reply with its time in milliseconds. 0% packet loss means the path works. 100% loss can be a firewall that blocks ping, so test the real port too.']; },
  ip: function () { return ['ip addr lists addresses per interface: inet is IPv4. ip route shows where traffic goes; "default via" is the gateway. No default route means no way off this network.']; },
  chmod: function () { return ['chmod prints nothing when it works. Check the result with ls -l. Numbers: 4 read, 2 write, 1 execute, added per owner, group, other (644 is rw-r--r--, 755 is rwxr-xr-x).']; },
  cat: function () { return ['cat prints a file as it is. For long files use less, head or tail -n 50.']; }
};
var BY_TEXT = [
  [/Permission denied/i, 'Permission denied: the user running the command may not read, write or run that path. Check ls -l on the file and its parent directory, and whoami. Use sudo only when the task really needs more rights.'],
  [/No such file or directory/i, 'No such file or directory: the path is wrong, a directory is missing, or you are in a different folder than you think. Check pwd, then ls the parent.'],
  [/command not found/i, 'command not found: the name is misspelled, the program is not installed, or its folder is not in PATH. Try: type NAME, then echo $PATH.'],
  [/Connection refused/i, 'Connection refused: the machine answered but nothing listens on that port. Check that the service runs and which port it uses: ss -ltnp.'],
  [/timed out|timeout/i, 'A timeout means no answer at all, which usually points to a firewall or a wrong address rather than a stopped service.'],
  [/Unit .* (not found|could not be found)/i, 'The unit does not exist. Check the name with: systemctl list-unit-files | grep NAME.'],
  [/AccessDenied|UnauthorizedOperation|AuthorizationFailed/i, 'The cloud API refused this identity. Read the message: it names the action. Check the profile with sts get-caller-identity (AWS) or az account show (Azure), then the policy or role.'],
  [/Operation not permitted/i, 'Operation not permitted: even with the right file mode, something else forbids it, such as a protected attribute, a read-only mount or not being root.'],
  [/Read-only file system/i, 'The filesystem is mounted read-only. Look at mount | grep ro, and dmesg for the disk error that caused it.'],
  [/No space left on device/i, 'The disk or its inode table is full. Run df -h and df -i, then du -sh on the biggest directory.']
];
function firstWord(cmd) { var w = cmd.trim().replace(/^(sudo|time|env)\s+/, '').split(/\s+/)[0] || ''; return w.replace(/^.*\//, ''); }
function explain(cmd, output) {
  var out = [], w = firstWord(cmd), o = output || '';
  BY_TEXT.forEach(function (r) { if (r[0].test(o)) out.push(r[1]); });
  if (BY_CMD[w]) { try { BY_CMD[w](cmd, o).forEach(function (x) { out.push(x); }); } catch (x) { /* ignore */ } }
  if (!out.length) out.push(o.trim() ? 'No rule matches this command yet. Read the output top to bottom, find the first line that says error, failed or denied, and check that thing first.' : 'The command printed nothing. For most commands that means it worked. Check the exit status with: echo $?');
  return out;
}
return { explain: explain };
}());
