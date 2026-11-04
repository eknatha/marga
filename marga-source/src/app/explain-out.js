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
  aws: function (c, o) { return cloud('aws', c, o); },
  az: function (c, o) { return cloud('az', c, o); },
  ping: function () { return ['Each line is one reply with its time in milliseconds. 0% packet loss means the path works. 100% loss can be a firewall that blocks ping, so test the real port too.']; },
  ip: function () { return ['ip addr lists addresses per interface: inet is IPv4. ip route shows where traffic goes; "default via" is the gateway. No default route means no way off this network.']; },
  chmod: function () { return ['chmod prints nothing when it works. Check the result with ls -l. Numbers: 4 read, 2 write, 1 execute, added per owner, group, other (644 is rw-r--r--, 755 is rwxr-xr-x).']; },
  cat: function () { return ['cat prints a file as it is. For long files use less, head or tail -n 50.']; }
};
function tryJson(o) { try { return JSON.parse(o); } catch (x) { return null; } }
function world(r) { return (r || []).some(function (x) { return x === '0.0.0.0/0'; }); }
var AWS_ERR = {
  NoSuchBucket: 'NoSuchBucket is exact: nothing has that name. Names are shared worldwide, so a typo is the usual cause. List what you own with: aws s3 ls',
  NoSuchEntity: 'NoSuchEntity: the role, policy or user name does not exist in this account. List them first (aws iam list-roles) and copy the name or ARN exactly.',
  IncorrectInstanceState: 'The instance is in a state that does not allow this action (for example starting one that is terminated). Read its State with describe-instances before you retry.',
  OperationNotPermitted: 'The instance is protected from termination. That setting is a safety lock someone chose on purpose. Check why before you remove it, and never remove it only to make the command pass.',
  BucketNotEmpty: 'A bucket must be empty before it can be deleted. List its objects, and check versioning, because old versions also count.',
  VolumeInUse: 'The volume is attached to an instance. A volume in use cannot be deleted; check the attachment in describe-volumes before you act.',
  InvalidBucketName: 'Bucket names must be 3 to 63 characters of lower-case letters, digits, dots and hyphens.',
  ParamValidation: 'The command is missing an option or has a wrong value. Read the message: it names the option. aws help lists what this simulator supports.',
  NoSuchPublicAccessBlockConfiguration: 'No public access block has been set on this bucket yet, so nothing stops a public ACL. Setting all four options closes the door.',
  BucketAlreadyOwnedByYou: 'You already own a bucket with this name, so there is nothing to create.'
};
var AZ_ERR = {
  ResourceGroupNotFound: 'The resource group name is wrong or it was deleted. List the names with: az group list --query [].name -o tsv',
  ResourceNotFound: 'The resource was not found in that group. Check both the name and the -g group: a right name in the wrong group gives this error.',
  SecurityRuleParameterPriorityAlreadyTaken: 'Each priority number can be used once per direction. List the rules (az network nsg rule list) and choose a free number below the rule you want to win.',
  SecurityRuleInvalidPriority: 'Priorities must be between 100 and 4096. Lower numbers are evaluated first.',
  SecurityRuleNotFound: 'No rule has that name. List the rules and copy the name exactly.',
  ScopeLocked: 'A resource lock blocks this change. Locks are deliberate; find who set it and why before removing it.',
  RoleAssignmentExists: 'That person already has this role at this scope, so there is nothing to add. List assignments to confirm.',
  MissingSubscription: 'The scope must start with /subscriptions/ and the subscription id. Copy the id from az account show.',
  OperationNotAllowed: 'The subscription has hit its quota for this region and size. Ask for a quota increase or choose another size or region.'
};
function cloud(tool, cmd, o) {
  var out = [], m, j;
  if (tool === 'aws') {
    if ((m = /An error occurred \((\w+)\) when calling the (\w+) operation/.exec(o))) {
      var act = (/is not authorized to perform: (\S+)/.exec(o) || [])[1], who = (/User: (\S+)/.exec(o) || [])[1];
      if (m[1] === 'AccessDenied' || m[1] === 'UnauthorizedOperation') out.push('AWS refused ' + (act || m[2]) + (who ? ' for ' + who : '') + '. The identity that ran this command is not allowed that action; the bucket or resource itself is usually fine. Check who you are with: aws sts get-caller-identity. A different profile (--profile NAME) may be the one with permission.');
      else if (AWS_ERR[m[1]]) out.push(AWS_ERR[m[1]]);
    } else if (/NoSuchEntity|ParamValidation|InvalidParameterValue/.test(o) && /An error occurred/.test(o)) { var c2 = (/\((\w+)\)/.exec(o) || [])[1]; if (AWS_ERR[c2]) out.push(AWS_ERR[c2]); }
    if (/the following arguments are required|Parameter validation failed|needs --/.test(o)) out.push('An option is missing. The message names it. Options start with two hyphens and take a value.');
    j = tryJson(o);
    if (j && j.Account && j.Arn) out.push('You are ' + j.Arn.split(':').pop() + ' in account ' + j.Account + '. Every aws command runs as this identity. The profile comes from --profile, then AWS_PROFILE, then default.');
    if (j && j.SecurityGroups) j.SecurityGroups.forEach(function (g) {
      var rules = (g.IpPermissions || []).map(function (p) { var src = (p.IpRanges || []).map(function (r) { return r.CidrIp; }); return 'port ' + p.FromPort + (p.ToPort !== p.FromPort ? '-' + p.ToPort : '') + ' from ' + src.join(', ') + (world(src) ? ' (open to the whole internet)' : ''); });
      out.push(g.GroupId + ' allows ' + (rules.length ? rules.join('; ') : 'nothing in') + '. A rule with 0.0.0.0/0 accepts traffic from anywhere; /32 is one address.');
    });
    if (j && j.Reservations) out.push(j.Reservations.length + ' instance(s): ' + j.Reservations.map(function (r) { var i = r.Instances[0], n = ((i.Tags || []).filter(function (t) { return t.Key === 'Name'; })[0] || {}).Value; return i.InstanceId + (n ? ' (' + n + ')' : '') + ' is ' + i.State.Name; }).join('; ') + '. Only a running instance serves traffic; stopped ones keep their disk.');
    if (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d +(\d+ )?\S+/m.test(o) && /\bs3\b/.test(cmd)) out.push('Each row is a date, a time, a size in bytes (objects only) and a name. Rows with only a name are buckets. A name with slashes is a key prefix, not a real folder.');
    if (j && j.PolicyStatus) out.push('IsPublic ' + j.PolicyStatus.IsPublic + ' means ' + (j.PolicyStatus.IsPublic ? 'anyone on the internet can read this bucket. Fix both the ACL and the public access block.' : 'no policy or ACL makes this bucket public.'));
    if (j && j.AttachedPolicies) out.push('The role has ' + j.AttachedPolicies.length + ' attached polic' + (j.AttachedPolicies.length === 1 ? 'y' : 'ies') + ': ' + j.AttachedPolicies.map(function (p) { return p.PolicyName; }).join(', ') + '. ' + (j.AttachedPolicies.some(function (p) { return /Administrator/.test(p.PolicyName); }) ? 'AdministratorAccess means full power: replace it with a narrow policy.' : 'Each policy adds permissions; none take them away.'));
    if (!out.length) out.push('The output is JSON by default. --query picks part of it and --output table or text changes the form. An AccessDenied error names the action and the identity: that is a missing permission, not a missing resource.');
    return out;
  }
  if ((m = /ERROR: \((\w+)\)/.exec(o)) && AZ_ERR[m[1]]) out.push(AZ_ERR[m[1]]);
  if (/the following arguments are required/.test(o)) out.push('A required option is missing. The message names it. -g is the resource group and -n the resource name.');
  if (/this simulator cannot ask|Add --yes/.test(o)) out.push('Deleting needs --yes to confirm, because the real command would ask you a question. Check the name again before you confirm.');
  j = tryJson(o);
  if (j && j.user && j.name && j.id) out.push('You are signed in as ' + j.user.name + ' on the subscription "' + j.name + '". Every az command acts on this subscription. Make sure it is the one you mean before any delete.');
  if (Array.isArray(j) && j.length && j[0].roleDefinitionName) out.push(j.length + ' role assignment(s): ' + j.map(function (r) { return r.roleDefinitionName + ' at ' + (/resourceGroups/.test(r.scope) ? 'group ' + r.scope.split('/').pop() : 'the subscription'); }).join('; ') + '. The scope, not only the role, decides how far access reaches. Owner at subscription scope is the widest.');
  if (Array.isArray(j) && j.length && j[0].priority !== undefined) out.push('Rules are checked from the lowest priority number up and the first match wins: ' + j.slice().sort(function (a, b) { return a.priority - b.priority; }).map(function (r) { return r.priority + ' ' + r.name + ' ' + r.access + ' port ' + r.destinationPortRange + ' from ' + r.sourceAddressPrefix; }).join('; ') + '.');
  if (j && j.powerState) out.push('The VM power state is "' + j.powerState + '". Deallocated releases the hardware and stops compute billing; stopped does not.');
  if (Array.isArray(j) && j.length && j[0].location !== undefined && j[0].tags !== undefined && /group/.test(cmd)) out.push(j.length + ' resource group(s). Tags like purpose or owner are how you decide what is safe to delete; the name alone can mislead.');
  if (!out.length) out.push('The output is JSON by default. --query picks part of it and -o table makes it readable. Check which subscription is active with: az account show.');
  return out;
}
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

/* "Why did that fail?": did-you-mean and the usual cause for a command that went wrong. */
function lev(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; }
  for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function nearest(word, list, max) {
  var best = [], w = word.toLowerCase();
  list.forEach(function (x) { if (x === w) return; var dd = lev(w, x.toLowerCase()); if (dd <= (max || 2) || (w.length > 2 && x.indexOf(w) === 0)) best.push([dd, x]); });
  best.sort(function (a, b) { return a[0] - b[0] || a[1].localeCompare(b[1]); });
  return best.slice(0, 3).map(function (x) { return x[1]; });
}
var KNOWN_SUB = {
  kubectl: ['get', 'describe', 'logs', 'apply', 'delete', 'exec', 'rollout', 'scale', 'edit', 'config', 'top', 'cordon', 'drain', 'expose', 'create', 'patch', 'label', 'run', 'events', 'port-forward', 'set'],
  docker: ['ps', 'run', 'build', 'images', 'logs', 'exec', 'stop', 'start', 'rm', 'rmi', 'inspect', 'pull', 'network', 'volume', 'compose', 'stats', 'restart'],
  systemctl: ['status', 'start', 'stop', 'restart', 'reload', 'enable', 'disable', 'is-active', 'is-enabled', 'daemon-reload', 'list-units', 'cat', 'mask', 'unmask'],
  git: ['status', 'add', 'commit', 'push', 'pull', 'log', 'diff', 'branch', 'checkout', 'switch', 'merge', 'rebase', 'stash', 'reset', 'clone', 'fetch'],
  aws: ['s3', 's3api', 'ec2', 'iam', 'sts', 'logs', 'cloudwatch', 'lambda', 'rds', 'kms', 'configure'],
  az: ['account', 'group', 'vm', 'network', 'role', 'storage', 'keyvault', 'login', 'monitor', 'resource', 'lock']
};
function why(cmd, output, code, ctx) {
  ctx = ctx || {}; var o = output || '', out = [], m, w = firstWord(cmd), words = cmd.trim().split(/\s+/);
  if ((m = /(?:bash: )?(\S+): command not found/.exec(o))) {
    var bad = m[1], near = nearest(bad, ctx.commands || [], 2);
    if (/^cd\.\.$|^ls-/.test(bad)) near = [bad.replace(/^(cd|ls)/, '$1 ')];
    out.push(near.length ? 'The shell does not know "' + bad + '". Did you mean: ' + near.join(', ') + '?' : 'The shell does not know "' + bad + '". Check the spelling; if it is a real program it may not be installed in this lab.');
    out.push('Command names are case sensitive and need a space before the first option.');
  }
  if ((m = /(?:cannot access|cannot open|cannot stat|cannot remove|cannot read)?\s*'?([^\s':]+)'?: No such file or directory/.exec(o))) {
    var path = m[1], slash = path.lastIndexOf('/'), dir = slash >= 0 ? path.slice(0, slash + 1) : '', base = path.slice(slash + 1), names = [];
    try { names = ctx.listDir ? ctx.listDir(dir || '.') : []; } catch (x) { names = []; }
    var nn = nearest(base, names, 2);
    out.push(nn.length ? 'There is no "' + path + '". Close names in that folder: ' + nn.map(function (x) { return dir + x; }).join(', ') + '.' : 'There is no "' + path + '". Run pwd to see where you are and ls ' + (dir || '.') + ' to see what is there. Relative paths start from your current folder.');
  }
  if (/Permission denied/.test(o)) out.push('Permission denied: you are not allowed to do that to that file or folder. Look at it with ls -l, check the owner and mode, then decide: sudo for a system task, chmod or chown if the lab asks for a permission fix.');
  if (/missing operand|requires an argument|option requires|invalid option|unrecognized option/i.test(o)) out.push('The command was given too little or a flag it does not know. Try: ' + w + ' --help (or man ' + w + ') to see what it accepts.');
  if (/unknown command|invalid choice|is not a docker command|is not a git command|Unknown command|Unknown operation|not a valid command|Invalid choice/i.test(o) || (/aws|az/.test(w) && /usage:|Usage:/.test(o) && code)) {
    var sub = words[1] && !/^-/.test(words[1]) ? words[1] : '', ks = KNOWN_SUB[w] || [], nb = sub ? nearest(sub, ks, 2) : [];
    out.push(nb.length ? w + ' does not have "' + sub + '". Did you mean: ' + nb.join(', ') + '?' : w + ' did not accept that sub-command. Run: ' + w + ' help to see what this simulator supports.');
  }
  if (/Unit .* not found|could not be found/.test(o)) out.push('That service name does not exist. List real ones with: systemctl list-units --type=service');
  if (/^error: .*must be specified|namespace .* not found|NotFound|not found/im.test(o) && w === 'kubectl') out.push('Kubernetes looks in one namespace at a time. Add -n NAME, or list all with: kubectl get ns, then kubectl get pods -A');
  if (/Is a directory/.test(o)) out.push('That path is a folder, and the command wanted a file. Use ls to look inside it, or -r for commands that can recurse.');
  if (/Not a directory/.test(o)) out.push('Part of the path is a file, not a folder. Check each segment with ls -ld.');
  if (/(aws|az)/.test(w) && /An error occurred|ERROR:/.test(o)) { out = out.concat(cloud(w, cmd, o).slice(0, 2)); }
  if (!out.length) {
    var line = o.split('\n').filter(function (l) { return /error|fail|denied|cannot|invalid|unable|refused/i.test(l); })[0];
    out.push(line ? 'The first line that looks like the problem: "' + line.trim().slice(0, 140) + '". Fix that one first, then run the command again.' : 'Nothing in the output names a clear cause. Run echo $? to see the exit status, then try the command with --help, or break it into smaller steps.');
  }
  return out;
}
function failed(cmd, res) {
  if (!res) return false;
  if (res.code && res.code !== 0) {
    if (/^\s*(grep|diff|test|\[|cmp)\b/.test(cmd) && !res.err) return false;
    return true;
  }
  return false;
}
/* A short list of commands for the lab's subject, so a learner never starts from a blank prompt. */
var CHEATS = {
  linux: [['Where am I', 'pwd'], ['List files', 'ls -la'], ['Disk space', 'df -h'], ['Biggest folders', 'du -sh * | sort -h'], ['Processes', 'ps aux'], ['Service status', 'systemctl status '], ['Recent logs', 'journalctl -xe --no-pager | tail -20'], ['Open ports', 'ss -ltnp'], ['Search text', 'grep -rn "" .'], ['Who am I', 'id']],
  bash: [['Where am I', 'pwd'], ['List files', 'ls -la'], ['Read a file', 'cat '], ['Search text', 'grep -n "" '], ['Count lines', 'wc -l '], ['Exit status', 'echo $?'], ['Check syntax', 'bash -n '], ['Make runnable', 'chmod +x '], ['Show variables', 'env | sort | head'], ['First lines', 'head -n 20 ']],
  networking: [['My addresses', 'ip addr'], ['Routes', 'ip route'], ['Reach a host', 'ping -c 3 '], ['Resolve a name', 'dig '], ['Open ports', 'ss -ltnp'], ['Fetch a page', 'curl -i '], ['Trace the path', 'traceroute '], ['DNS settings', 'cat /etc/resolv.conf'], ['Firewall rules', 'iptables -L -n'], ['Hosts file', 'cat /etc/hosts']],
  docker: [['Running containers', 'docker ps'], ['All containers', 'docker ps -a'], ['Container logs', 'docker logs '], ['Inspect', 'docker inspect '], ['Images', 'docker images'], ['Shell inside', 'docker exec -it  sh'], ['Restart', 'docker restart '], ['Networks', 'docker network ls'], ['Volumes', 'docker volume ls'], ['Live usage', 'docker stats --no-stream']],
  kubernetes: [['Pods', 'kubectl get pods'], ['All namespaces', 'kubectl get pods -A'], ['Describe', 'kubectl describe pod '], ['Logs', 'kubectl logs '], ['Previous logs', 'kubectl logs  --previous'], ['Events', 'kubectl get events --sort-by=.lastTimestamp'], ['Apply a file', 'kubectl apply -f '], ['Rollout status', 'kubectl rollout status deploy/'], ['Rollback', 'kubectl rollout undo deploy/'], ['Services', 'kubectl get svc,endpoints']],
  cloud: [['Who am I (AWS)', 'aws sts get-caller-identity'], ['Buckets', 'aws s3 ls'], ['Instances', 'aws ec2 describe-instances'], ['Security groups', 'aws ec2 describe-security-groups'], ['Roles', 'aws iam list-roles'], ['Who am I (Azure)', 'az account show'], ['Resource groups', 'az group list -o table'], ['VMs', 'az vm list -o table'], ['Role assignments', 'az role assignment list -o table'], ['Network rules', 'az network nsg rule list -g  --nsg-name  -o table']],
  python: [['Run a script', 'python3 '], ['Version', 'python3 --version'], ['List files', 'ls -la'], ['Read a file', 'cat '], ['Run tests', 'python3 -m unittest -v'], ['Installed packages', 'pip list']]
};
function cheats(mod) { return CHEATS[mod] || CHEATS.linux; }
return { explain: explain, why: why, failed: failed, cheats: cheats, nearest: nearest };
}());
