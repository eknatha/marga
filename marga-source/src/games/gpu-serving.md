## The model server that runs out of memory
module: gpu-serving
level: Advanced
minutes: 7
lesson: gpu-serving/gpu-basics-memory-and-what-limits-inference
summary: A new model container crashes on start with a CUDA out of memory error on a 24 GB GPU. Work out why and choose a fix.
intro: You deploy a 13 billion parameter model in 16-bit precision on a 24 GB GPU. The container exits with torch.cuda.OutOfMemoryError. A colleague suggests buying a bigger GPU.

### s1
text: What do you work out first? Think about what the evidence shows.
- Estimate memory: parameters times bytes per parameter, plus KV cache and overhead => s2 | 2 | Weights alone decide whether the model can load. Example: 13 billion parameters at 2 bytes is about 26 GB, which is more than the 24 GB the card has.
- Buy a bigger GPU straight away => s3 | 1 | It may be right, but a calculation might offer cheaper options. Example: A 48 GB card is ordered, and the team discovers quantisation would have fit the model on the card it had.
- Retry until it works => s3 | 0 | The arithmetic does not change. Example: Five restarts, five identical errors.

### s2
text: The weights alone need about 26 GB. What are the realistic options?
- Use a quantised version such as 8-bit or 4-bit, split across two GPUs with tensor parallelism, or choose a smaller model => s4 | 2 | Each option reduces memory per GPU or the model size. Example: 8-bit needs about 13 GB for weights; two 24 GB cards with tensor parallel size 2 hold the 26 GB across 48 GB.
- Lower the batch size to 1 => s3 | 1 | This reduces activations and cache but not the weights. Example: The model still fails to load.
- Increase the context length => s3 | 0 | That increases KV cache memory. Example: The memory error comes sooner.

### s3
text: You choose 8-bit quantisation. What else do you check?
- Quality on your own test prompts, the KV cache budget for your context length and concurrency, and latency => end-win | 2 | Quantisation changes quality and the cache still needs room. Example: A test set of 200 prompts shows a small quality drop, and max-model-len 8192 with 16 concurrent requests fits in the remaining memory.
- Nothing; it loaded => end-ok | 1 | Loading is only the first check. Example: Under load the server returns out of memory errors when 20 users send long prompts.
- Set the memory use to 100 percent => end-fail | 0 | No headroom leads to out of memory under load. Example: The first long request crashes the server.

### s4
text: How do you prevent surprises for the next model?
- A sizing note that lists weights, KV cache per request, overhead and a test under realistic load before release => end-win | 2 | The team can predict fit before deploying. Example: A spreadsheet computes memory for each model and context length.
- Always choose the biggest GPU => end-ok | 1 | It wastes money. Example: Costs triple for models that would have fit on a smaller card.
- Keep trying models until one loads => end-fail | 0 | It is slow and unreliable. Example: Each trial costs an hour of GPU time.

### end-win
end: win
text: The model loads, quality is checked and a sizing note covers the next model.
takeaway: Memory is arithmetic: weights, cache and overhead. Do the sum before you deploy.

### end-ok
end: ok
text: It loads, but the cache budget was ignored and load causes crashes.
takeaway: Fitting at idle is not fitting under load.

### end-fail
end: fail
text: The server crashes under load, and nobody knows why.
takeaway: No headroom means failure on the first heavy request.


## The GPU pod that stays Pending
module: gpu-serving
level: Advanced
minutes: 7
lesson: gpu-serving/gpus-on-kubernetes
summary: A model Deployment on Kubernetes never schedules. Find out why the cluster cannot place a GPU pod.
intro: You apply a Deployment that requests nvidia.com/gpu: 1. The pod stays Pending for an hour. Your team says the cluster has GPU nodes.

### s1
text: What do you check first? Think about what the evidence shows.
- kubectl describe pod for the scheduling events, then node capacity for nvidia.com/gpu => s2 | 2 | The events say why the scheduler refused the pod. Example: 0/6 nodes are available: 4 Insufficient nvidia.com/gpu, 2 node(s) had untolerated taint nvidia.com/gpu.
- Delete the Deployment and recreate it => s3 | 0 | The same spec fails the same way. Example: The new pod is Pending with the same events.
- Increase the replica count => s3 | 1 | More pods are more Pending pods. Example: Three Pending pods instead of one.

### s2
text: Four nodes have no free GPUs and two have GPUs but a taint. What does that mean?
- The GPU nodes are tainted so only pods with a matching toleration can run, and the other GPUs are already allocated => s4 | 2 | Taints keep ordinary pods off GPU nodes and need a toleration. Example: The pod spec has no tolerations; adding key nvidia.com/gpu operator Exists effect NoSchedule lets it schedule on the tainted nodes.
- Kubernetes does not support GPUs => s3 | 0 | It does, through the device plugin. Example: Other teams already run GPU pods.
- The image is too large => s3 | 1 | That would cause image pull issues, not scheduling failures. Example: The events mention scheduling, not pulling.

### s3
text: After adding the toleration, the pod is scheduled but crashes with no CUDA devices. What next?
- Check the NVIDIA device plugin and container runtime on that node, and run nvidia-smi inside the pod => s4 | 2 | Scheduling and runtime access are separate steps. Example: The device plugin pod on the node is in CrashLoopBackOff; fixing it makes nvidia-smi show the GPU.
- Remove the GPU request => end-fail | 0 | The pod then runs without a GPU and cannot serve the model. Example: The server falls back to CPU and is ten times slower.
- Reinstall the cluster => end-ok | 1 | Far too much for a plugin issue. Example: A week is lost to a one-pod fix.

### s4
text: How do you make this easier for the next team?
- Document the toleration and node selector, use the GPU Operator, and alert on unschedulable GPU pods and device plugin health => end-win | 2 | The next deployment works and failures are visible. Example: A runbook lists the GPU labels and taints, and an alert fires when a GPU pod is Pending for 10 minutes.
- Remove the taints => end-ok | 1 | Other workloads then land on expensive GPU nodes. Example: Log shippers occupy GPU nodes.
- Tell people to ask the platform team each time => end-fail | 0 | It does not scale. Example: Deployments wait days for answers.

### end-win
end: win
text: The pod runs on a GPU node, the runtime works and Pending GPU pods raise an alert.
takeaway: Scheduling needs capacity, tolerations and a working device plugin. Read the events.

### end-ok
end: ok
text: The pod runs, but taints were removed and costs are rising.
takeaway: Do not trade protection for convenience.

### end-fail
end: fail
text: The pod runs on CPU, slow and unnoticed.
takeaway: Silent fallback hides the real fault.


