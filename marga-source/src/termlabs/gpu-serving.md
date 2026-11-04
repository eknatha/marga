## The model server dies while loading
id: gp-vllm-oom
module: gpu-serving
level: Advanced
minutes: 12
lesson: gpu-serving/gpu-basics-memory-and-what-limits-inference
engine: Simulated Linux shell with LVM tools
summary: vLLM cannot start on a 24 GB GPU. Read the log and the GPU, then set a context length and memory share that fit.
@@ story
A new model container exits at start-up. The serve script asks for a 131072 token context and 98 percent of the GPU. The log estimates what fits. Choose settings that fit this 24 GB card with headroom, without changing the model.
@@ goals
- Read the server log and nvidia-smi.
- Set --max-model-len to no more than 16384.
- Set --gpu-memory-utilization between 0.85 and 0.92 and keep the model unchanged.
@@ hints
- `cat server.log` shows the estimated maximum model length. `nvidia-smi` shows 24 GB of memory.
- The KV cache grows with context length, so a shorter context frees memory for the cache.
- `sed -i 's/131072/8192/; s/0.98/0.90/' serve.sh`.
@@ file /home/user/llm-server/serve.sh
#!/bin/sh
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --max-model-len 131072 \
  --gpu-memory-utilization 0.98 \
  --port 8000

@@ file /home/user/llm-server/server.log
INFO model weights take 14.2 GiB
INFO available KV cache memory: 5.1 GiB
ValueError: To serve at least one request with max_model_len=131072, 7.0 GiB KV cache is needed, which is larger than the available KV cache memory (5.1 GiB). The estimated maximum model length is 94000. Try increasing gpu_memory_utilization or decreasing max_model_len.

@@ world
{"cwd": "/home/user/llm-server", "more": {"gpu": {"gpus": [{"name": "NVIDIA L4", "temp": 41, "power": 27, "cap": 72, "usedMiB": 0, "totalMiB": 23034, "util": 0}], "procs": []}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/llm-server/serve.sh",
  "label": "context length is 16384 or less",
  "re": "--max-model-len\\s+(\\d{3,4}|1[0-5]\\d{3}|16384)(\\s|\\\\|$)"
 },
 {
  "t": "contains",
  "path": "/home/user/llm-server/serve.sh",
  "label": "GPU memory share is 0.85 to 0.92",
  "re": "--gpu-memory-utilization\\s+0\\.(8[5-9]|9[0-2]?)(\\s|\\\\|$)"
 },
 {
  "t": "contains",
  "path": "/home/user/llm-server/serve.sh",
  "label": "the model was not changed",
  "text": "Qwen/Qwen2.5-7B-Instruct"
 }
]
@@ explain
A serving engine reserves GPU memory for the weights, then fills what is left with the KV cache. A very long context needs a large cache for every request, so the estimated maximum fell far below what was asked. Lowering the context, quantising the model or adding a GPU are the usual levers. Leave headroom, because a share of 98 percent fails on the first spike.
@@ solution
cat server.log
nvidia-smi
cat serve.sh
sed -i 's/--max-model-len 131072/--max-model-len 8192/; s/--gpu-memory-utilization 0.98/--gpu-memory-utilization 0.90/' serve.sh
cat serve.sh


## The GPU pod stays Pending
id: gp-pod-pending-gpu
module: gpu-serving
level: Advanced
minutes: 12
lesson: gpu-serving/gpus-on-kubernetes
engine: Simulated Linux shell with configuration files
summary: The scheduler cannot place a model pod because the GPU nodes are tainted. Add the toleration and keep the GPU request.
@@ story
The deployment for the model server has been Pending for an hour. The events say the GPU nodes have a taint that the pod does not tolerate. Fix deployment.yaml so it can run on those nodes, and make sure it still asks for exactly one GPU.
@@ goals
- Read events.txt.
- Add a toleration for the nvidia.com/gpu taint with effect NoSchedule.
- Keep the limit nvidia.com/gpu: 1.
@@ hints
- The events say `untolerated taint {nvidia.com/gpu: present}`.
- A toleration goes under spec.template.spec, next to containers.
- Add `tolerations:` with key nvidia.com/gpu, operator Exists and effect NoSchedule.
@@ file /home/user/llm/events.txt
Warning  FailedScheduling  0/4 nodes are available: 2 node(s) had untolerated taint {nvidia.com/gpu: present}, 2 node(s) didn't match Pod's node affinity/selector.

@@ file /home/user/llm/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm
spec:
  replicas: 1
  selector:
    matchLabels:
      app: llm
  template:
    metadata:
      labels:
        app: llm
    spec:
      containers:
        - name: server
          image: vllm/vllm-openai:latest
          resources:
            limits:
              nvidia.com/gpu: 1

@@ world
{"cwd": "/home/user/llm"}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/llm/deployment.yaml",
  "label": "a toleration for the GPU taint exists",
  "re": "tolerations:[\\s\\S]*key:\\s*nvidia\\.com/gpu"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/deployment.yaml",
  "label": "the toleration uses NoSchedule",
  "re": "effect:\\s*NoSchedule"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/deployment.yaml",
  "label": "the pod still asks for one GPU",
  "re": "nvidia\\.com/gpu:\\s*1\\s*$"
 }
]
@@ explain
GPU nodes are usually tainted so ordinary pods stay off expensive hardware. A pod must tolerate the taint to land there, and it must also ask for the GPU as a resource, which the device plugin satisfies. Read the scheduler events first; they name the exact reason a pod cannot be placed.
@@ solution
cat events.txt
cat deployment.yaml
printf '      tolerations:\n        - key: nvidia.com/gpu\n          operator: Exists\n          effect: NoSchedule\n' >> deployment.yaml
cat deployment.yaml


## Autoscale on queue depth, not CPU
id: gp-hpa-queue
module: gpu-serving
level: Advanced
minutes: 10
lesson: gpu-serving/scaling-latency-and-cost
engine: Simulated Linux shell with configuration files
summary: Change a HorizontalPodAutoscaler so it scales on waiting requests.
@@ story
The model service has a CPU-based autoscaler, but CPU stays low while the GPU is saturated and users wait. Edit hpa.yaml to scale on the vllm:num_requests_waiting metric with a target average of 4.
@@ goals
- Read hpa.yaml and the note.
- Replace the CPU metric with the queue metric.
- Set the target average value to 4.
@@ hints
- `cat note.txt` says CPU is 12% while latency is 9 s.
- Change the metric name and the value.
- `sed -i 's/name: cpu/name: vllm:num_requests_waiting/; s/averageUtilization: 70/averageValue: 4/; s/type: Resource/type: Pods/' hpa.yaml`
@@ world
{"cwd": "/home/user/llm"}
@@ file /home/user/llm/note.txt
CPU 12%, GPU 100%, time to first token 9 s, queue 40 requests

@@ file /home/user/llm/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm
spec:
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/llm/hpa.yaml",
  "label": "the queue metric is used",
  "re": "vllm:num_requests_waiting"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/hpa.yaml",
  "label": "CPU is no longer the signal",
  "re": "name:\\s*cpu",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/llm/hpa.yaml",
  "label": "target average is 4",
  "re": "averageValue:\\s*4"
 }
]
@@ explain
CPU says little about a GPU service. Queue depth or time to first token grows exactly when capacity is short, so it is a better scaling signal. Scale-up is slow because a model takes minutes to load, so keep a floor of replicas.
@@ solution
cat note.txt
cat hpa.yaml
sed -i 's/name: cpu/name: vllm:num_requests_waiting/; s/averageUtilization: 70/averageValue: 4/; s/type: Resource/type: Pods/; s/resource:/pods:/; s/type: Utilization/type: AverageValue/' hpa.yaml
cat hpa.yaml


## A 70B model does not fit one card
id: gp-quantize-fit
module: gpu-serving
level: Advanced
minutes: 10
lesson: gpu-serving/gpu-basics-memory-and-what-limits-inference
engine: Simulated Linux shell with configuration files
summary: Edit the launch script to use a 4-bit quantised model and sane limits.
@@ story
The 70B model in 16-bit needs about 140 GB, but the card has 80 GB. A 4-bit AWQ build of the model fits. Change the launch script to use the AWQ model and add --quantization awq with --max-model-len 8192.
@@ goals
- Read serve.sh and error.log.
- Use the -AWQ model name and --quantization awq.
- Set --max-model-len 8192.
@@ hints
- `cat error.log` shows a CUDA out of memory at load.
- The model name is llama-70b.
- Replace it with llama-70b-AWQ and add the two flags.
@@ world
{"cwd": "/home/user/llm"}
@@ file /home/user/llm/error.log
torch.cuda.OutOfMemoryError: tried to allocate 140 GiB, 80 GiB total

@@ file /home/user/llm/serve.sh
#!/bin/sh
vllm serve llama-70b --dtype float16

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/llm/serve.sh",
  "label": "the AWQ model is used",
  "re": "llama-70b-AWQ"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/serve.sh",
  "label": "quantization is set",
  "re": "--quantization awq"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/serve.sh",
  "label": "context is limited",
  "re": "--max-model-len\\s+8192"
 }
]
@@ explain
Weights dominate GPU memory. Four-bit weights are about a quarter of the 16-bit size, which leaves room for the KV cache. Always evaluate answer quality after quantising.
@@ solution
cat error.log
cat serve.sh
sed -i 's#vllm serve llama-70b --dtype float16#vllm serve llama-70b-AWQ --quantization awq --max-model-len 8192#' serve.sh
cat serve.sh


## The model pod is killed while loading
id: gp-startup-probe
module: gpu-serving
level: Advanced
minutes: 10
lesson: gpu-serving/monitoring-and-debugging-gpu-workloads
engine: Simulated Linux shell with configuration files
summary: Add a startup probe so a slow model load is not killed by the liveness probe.
@@ story
A new replica restarts again and again. Loading the weights takes about five minutes, but the liveness probe gives up after thirty seconds. Add a startupProbe on /health with a failureThreshold of 60 and a period of 10 seconds.
@@ goals
- Read events.txt and deployment.yaml.
- Add a startupProbe.
- Use failureThreshold 60 and periodSeconds 10.
@@ hints
- `cat events.txt` shows Liveness probe failed and Killing container.
- A startupProbe holds off the other probes until it passes.
- Append the probe under the container with printf.
@@ world
{"cwd": "/home/user/llm"}
@@ file /home/user/llm/events.txt
Warning Unhealthy liveness probe failed: connection refused
Normal Killing container failed liveness probe
model load time: about 300 s

@@ file /home/user/llm/deployment.yaml
spec:
  containers:
    - name: server
      image: vllm/vllm-openai:latest
      livenessProbe:
        httpGet: {path: /health, port: 8000}
        periodSeconds: 10
        failureThreshold: 3

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/llm/deployment.yaml",
  "label": "a startup probe exists",
  "re": "startupProbe:"
 },
 {
  "t": "contains",
  "path": "/home/user/llm/deployment.yaml",
  "label": "it allows about ten minutes",
  "re": "failureThreshold:\\s*60"
 }
]
@@ explain
Liveness checks restart a container that is stuck, but a model that is still loading looks stuck. A startup probe disables the other probes until the server is up, with enough attempts to cover the load time.
@@ solution
cat events.txt
cat deployment.yaml
printf '      startupProbe:\n        httpGet: {path: /health, port: 8000}\n        periodSeconds: 10\n        failureThreshold: 60\n' >> deployment.yaml
cat deployment.yaml

