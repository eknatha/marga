## CUDA out of memory at start
level: senior
A model container exits during start-up.

```text
torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.20 GiB. GPU 0 has a total capacity of 24.00 GiB of which 0.45 GiB is free.
$ nvidia-smi --query-gpu=memory.used,memory.total --format=csv
23100 MiB, 24576 MiB
```
? What is the most likely cause?
+ The model weights and cache do not fit in GPU memory
- The network is slow
- The CPU is too fast
- The disk is full
why: GPU memory is nearly all in use. Reduce model size with quantisation, lower the context length, or use more GPUs.

## Pod Pending for GPU
level: mid
A GPU Deployment never starts.

```text
Events:
  Warning  FailedScheduling  0/5 nodes are available: 5 Insufficient nvidia.com/gpu.
```
? What does this mean?
+ No node has a free GPU to give the pod
- The image does not exist
- The pod has a syntax error
- The service account is missing
why: The scheduler found no node with an unallocated GPU. Free one, add nodes, or share GPUs deliberately.

## High latency, low GPU use
level: senior
Users report slow answers, but the GPU shows 15 percent use.

```text
$ nvidia-smi dmon -c 3
# gpu pwr gtemp sm mem
    0  92   51  14  30
$ top -bn1 | head -4
CPU: 98 percent of one core busy in python tokenizer
```
? What should you suspect?
+ A CPU-bound bottleneck such as tokenisation or request handling is starving the GPU
- The GPU is too cold
- The model has too many layers
- The driver is new
why: A busy CPU with an idle GPU points to preprocessing or serving overhead. Batch requests and move work off the critical path.

## Latency climbs with traffic
level: senior
Time to first token rises sharply when concurrency grows.

```text
vllm: num_requests_running=64 num_requests_waiting=210 gpu_cache_usage_perc=0.99
```
? What does it show?
+ The KV cache is full and requests are queueing, so you need more capacity or a lower limit
- The network is down
- The GPU has too much memory
- The model is untrained
why: A cache near 100 percent with a long waiting queue means demand exceeds capacity. Scale out or limit context and concurrency.

## XID error in logs
level: senior
A GPU node drops jobs after a few days.

```text
dmesg: NVRM: Xid (PCI:0000:3b:00): 79, GPU has fallen off the bus.
```
? What should you do?
+ Treat it as a hardware or driver fault: drain the node, check power and cooling, and involve the vendor
- Restart the model container
- Increase batch size
- Delete the pod
why: Xid 79 means the GPU stopped responding on the bus. Drain the node and investigate hardware before putting it back.

