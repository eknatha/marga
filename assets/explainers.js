/* MARGA animated explainers: data only. Each step moves a message between two actors (from, to are indexes into actors; equal means the actor does something itself). */
window.MARGA_EXPLAINERS = [
{ id: 'dns-lookup', module: 'networking', title: 'How a DNS lookup works', summary: 'What happens between typing a name and getting an IP address.',
  actors: ['Browser', 'Resolver', 'Root server', 'TLD server', 'Authoritative server'],
  steps: [
    { f: 0, t: 0, l: 'Check caches', n: 'The browser and the operating system look in their own caches first. If the answer is there and has not expired, the lookup ends here.' },
    { f: 0, t: 1, l: 'Where is app.example.com?', n: 'The browser asks the recursive resolver, usually run by your network or ISP, to find the answer on its behalf.' },
    { f: 1, t: 2, l: 'Who handles .com?', n: 'The resolver has no cached answer, so it asks a root server. Roots do not know the address, but they know who runs each top-level domain.' },
    { f: 2, t: 1, l: 'Ask the .com servers', n: 'The root server replies with a referral to the servers for .com.' },
    { f: 1, t: 3, l: 'Who handles example.com?', n: 'The resolver asks a .com server about example.com.' },
    { f: 3, t: 1, l: 'Ask example.com name servers', n: 'The TLD server replies with the name servers that are responsible for example.com.' },
    { f: 1, t: 4, l: 'What is app.example.com?', n: 'The resolver asks the authoritative server, which holds the real records.' },
    { f: 4, t: 1, l: 'A record: 203.0.113.10 (TTL 300)', n: 'The authoritative server answers with the IP address and a TTL. The TTL says how many seconds the answer may be cached.' },
    { f: 1, t: 0, l: '203.0.113.10', n: 'The resolver caches the answer for the TTL and returns it. The browser can now open a connection.' }
  ] },
{ id: 'tcp-handshake', module: 'networking', title: 'The TCP three-way handshake', summary: 'How two machines agree to talk before any data moves.',
  actors: ['Client', 'Server'],
  steps: [
    { f: 1, t: 1, l: 'Listening on port 443', n: 'The server has a program bound to a port and waiting for connections.' },
    { f: 0, t: 1, l: 'SYN, seq=100', n: 'The client sends a SYN packet with a starting sequence number. It means: I want to connect, and I will number my bytes from here.' },
    { f: 1, t: 0, l: 'SYN-ACK, seq=300, ack=101', n: 'The server agrees. It acknowledges the client number (ack=101) and sends its own starting sequence number.' },
    { f: 0, t: 1, l: 'ACK, ack=301', n: 'The client acknowledges the server number. The connection is now established in both directions.' },
    { f: 0, t: 1, l: 'Data: GET / HTTP/1.1', n: 'Application data can flow. Every byte is numbered, so lost packets are noticed and sent again.' },
    { f: 1, t: 0, l: 'ACK + response data', n: 'The server acknowledges what it got and sends its reply.' },
    { f: 0, t: 1, l: 'FIN', n: 'When finished, one side sends FIN to close its direction. The other side acknowledges, then sends its own FIN.' }
  ] },
{ id: 'tls-handshake', module: 'networking', title: 'The TLS 1.3 handshake', summary: 'How a browser checks who it is talking to and sets up encryption.',
  actors: ['Browser', 'Web server', 'Certificate authority'],
  steps: [
    { f: 0, t: 1, l: 'ClientHello + key share', n: 'The browser lists the cipher suites it supports and sends its half of a key exchange. It also sends the server name it wants (SNI).' },
    { f: 1, t: 0, l: 'ServerHello + key share', n: 'The server picks a cipher suite and sends its half of the key exchange. Both sides can now work out the same secret keys without ever sending them.' },
    { f: 1, t: 0, l: 'Certificate (encrypted)', n: 'From here on the handshake is encrypted. The server sends its certificate, which names the site and carries a signature from a certificate authority.' },
    { f: 0, t: 2, l: 'Is this signature valid?', n: 'The browser checks the chain up to a certificate authority it already trusts, the dates, and that the name matches. This check uses built-in trust, not a live call; it is shown here to make the idea visible.' },
    { f: 1, t: 0, l: 'CertificateVerify + Finished', n: 'The server proves it holds the private key for the certificate by signing the handshake. Finished confirms nothing was changed on the way.' },
    { f: 0, t: 1, l: 'Finished', n: 'The browser confirms the handshake too. The connection is encrypted and the server is identified.' },
    { f: 0, t: 1, l: 'Encrypted HTTP request', n: 'Application data now travels encrypted with the session keys. A certificate that expires or does not match is why you see browser warnings.' }
  ] },
{ id: 'pod-scheduling', module: 'kubernetes', title: 'What happens when you create a pod', summary: 'From kubectl apply to a running container.',
  actors: ['kubectl', 'API server', 'etcd', 'Scheduler', 'Kubelet'],
  steps: [
    { f: 0, t: 1, l: 'kubectl apply -f pod.yaml', n: 'kubectl sends the object to the API server. The API server is the only component that talks to the cluster database.' },
    { f: 1, t: 1, l: 'Authenticate, authorise, validate', n: 'The API server checks who you are, whether you may create pods, and whether the object is valid. Admission controllers may change or reject it.' },
    { f: 1, t: 2, l: 'Store the pod', n: 'The pod is saved in etcd with no node assigned. Its phase is Pending.' },
    { f: 3, t: 1, l: 'Watch: unscheduled pods?', n: 'The scheduler watches the API server for pods that have no node.' },
    { f: 3, t: 3, l: 'Filter and score nodes', n: 'The scheduler removes nodes that cannot fit the pod (not enough CPU, taints, affinity) and scores the rest.' },
    { f: 3, t: 1, l: 'Bind pod to node-2', n: 'The scheduler writes the chosen node name back through the API server.' },
    { f: 4, t: 1, l: 'Watch: pods for my node', n: 'The kubelet on node-2 sees a pod assigned to it.' },
    { f: 4, t: 4, l: 'Pull image, start containers', n: 'The kubelet asks the container runtime to pull the image and start the containers, then runs the probes.' },
    { f: 4, t: 1, l: 'Status: Running, Ready', n: 'The kubelet reports status back. Once the readiness probe passes, Services start sending traffic to the pod.' }
  ] },
{ id: 'rolling-update', module: 'kubernetes', title: 'A rolling update of a Deployment', summary: 'How Kubernetes replaces pods without downtime.',
  actors: ['You', 'Deployment', 'New ReplicaSet', 'Old ReplicaSet', 'Service'],
  steps: [
    { f: 0, t: 1, l: 'Change image to v2', n: 'You update the pod template in the Deployment. Any change to the template starts a rollout.' },
    { f: 1, t: 2, l: 'Create ReplicaSet v2 (0 pods)', n: 'The Deployment controller creates a new ReplicaSet for the new template and keeps the old one.' },
    { f: 2, t: 2, l: 'Scale up by maxSurge (1 pod)', n: 'With maxSurge 25 percent the new ReplicaSet may add extra pods above the desired count.' },
    { f: 4, t: 2, l: 'Send traffic once Ready', n: 'The Service only sends traffic to a new pod after its readiness probe passes. A failing probe stops the rollout here, which protects users.' },
    { f: 1, t: 3, l: 'Scale down by maxUnavailable', n: 'Once new pods are ready, the old ReplicaSet is scaled down, never below the minimum available count.' },
    { f: 2, t: 3, l: 'Repeat until v2 is complete', n: 'Steps of scale up and scale down repeat until every pod runs the new version and the old ReplicaSet has zero pods.' },
    { f: 0, t: 1, l: 'kubectl rollout undo', n: 'The old ReplicaSet is kept so a rollback is fast: scale it back up and scale the new one down.' }
  ] },
{ id: 'terraform-workflow', module: 'terraform', title: 'The Terraform workflow', summary: 'Write, plan, apply, and where state fits in.',
  actors: ['You', 'Terraform', 'State file', 'Cloud API'],
  steps: [
    { f: 0, t: 1, l: 'terraform init', n: 'Terraform downloads the providers and modules that the code needs and configures the state backend.' },
    { f: 0, t: 1, l: 'terraform plan', n: 'You ask what would change. Terraform reads your code to find the desired state.' },
    { f: 1, t: 2, l: 'Read the recorded state', n: 'Terraform loads the state file, which records which real resources it already manages. With a remote backend it also takes a lock.' },
    { f: 1, t: 3, l: 'Refresh: what exists now?', n: 'Terraform asks the cloud API for the current settings of the resources in the state, so it notices drift.' },
    { f: 1, t: 1, l: 'Compare and build a plan', n: 'Desired state is compared with the real state. The plan lists each resource as create, update in place, replace or destroy.' },
    { f: 1, t: 0, l: 'Plan: 2 to add, 1 to change, 0 to destroy', n: 'You review the plan. Read the destroy and replace lines most carefully.' },
    { f: 0, t: 1, l: 'terraform apply (approve)', n: 'You approve. Terraform runs the plan in dependency order and in parallel where it can.' },
    { f: 1, t: 3, l: 'Create and update resources', n: 'Terraform calls the cloud API for each change.' },
    { f: 1, t: 2, l: 'Save the new state', n: 'The results are written to the state file and the lock is released. The state now matches reality again.' }
  ] },
{ id: 'cicd-pipeline', module: 'cicd', title: 'A change travelling through a pipeline', summary: 'From a code push to production, and where it can stop.',
  actors: ['Developer', 'Repository', 'CI runner', 'Registry', 'Production'],
  steps: [
    { f: 0, t: 1, l: 'Push a branch, open a review', n: 'The change is pushed and reviewed by a colleague. Branch rules can require passing checks before merging.' },
    { f: 1, t: 2, l: 'Trigger the pipeline', n: 'The push starts a pipeline on a runner, a clean machine or container that has only what the job needs.' },
    { f: 2, t: 2, l: 'Lint, unit tests, security scan', n: 'Fast checks run first so that obvious problems fail early and cheaply. A failure stops the pipeline and tells the author.' },
    { f: 2, t: 2, l: 'Build the artifact', n: 'The code is built once into an artifact, such as a container image, tagged with the commit ID.' },
    { f: 2, t: 3, l: 'Push image: app:3f9c2a1', n: 'The artifact goes to a registry. The same artifact is promoted through every environment, never rebuilt.' },
    { f: 2, t: 4, l: 'Deploy to staging, run smoke tests', n: 'The artifact is deployed to a staging environment and tested end to end.' },
    { f: 2, t: 4, l: 'Canary: 5 percent of traffic', n: 'In production a small share of traffic gets the new version while error rate and latency are watched.' },
    { f: 4, t: 2, l: 'Healthy: promote to 100 percent', n: 'If the numbers stay good the rollout continues. If not, the pipeline rolls back automatically.' }
  ] }
];
