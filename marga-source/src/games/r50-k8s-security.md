## The miner in the pod
module: k8s-security
level: Advanced
minutes: 7
lesson: k8s-security/incident-response-for-a-compromised-cluster
summary: A pod is mining cryptocurrency. Respond without losing the evidence or the cause.
intro: An alert says a pod in the payments namespace opened a shell and is making outbound connections to an unknown address.

### s1
text: What do you do first? Choose the best next step.
- Contain it with a quarantine label and deny policy, and cordon the node => s2 | 2 | Stop the spread and keep the pod for evidence. Example: Outbound traffic stops while the pod stays available for analysis.
- Delete the pod at once => s2 | 1 | You lose evidence and the Deployment recreates the same flaw. Example: The pod returns and the attacker reconnects.
- Wait until morning => end-fail | 0 | The attacker keeps access. Example: Credentials are used from another place overnight.

### s2
text: How do you preserve evidence? Choose the best next step.
- Copy logs and a disk snapshot of the node before changes => s3 | 2 | Evidence supports the root cause and the report. Example: The snapshot shows the dropped binary and its source.
- Restart the node to clean it => s3 | 1 | Restart erases memory and temporary files. Example: Key evidence is gone.
- Rely on memory of what you saw => end-fail | 0 | Not reliable. Example: Different people tell different stories.

### s3
text: Which credentials need action? Choose the best next step.
- Everything the pod could reach: its tokens, mounted secrets and the cloud role => s4 | 2 | The attacker may have copied them. Example: The cloud role showed new API calls from the same address.
- Only the pod password => s4 | 1 | Other credentials stay valid. Example: The attacker uses the node role instead.
- None because the pod is stopped => end-fail | 0 | Copied credentials still work. Example: Access continues from outside.

### s4
text: How do you prevent a repeat? Choose the best next step.
- Patch or rebuild the image, enforce Pod Security, restrict egress and add runtime detection => end-win | 2 | Fix the entry point and add layers. Example: A new attempt is blocked at egress and alerts within a minute.
- Only delete the namespace => end-ok | 1 | The same image can be redeployed. Example: The problem returns in a new place.
- Change the pod name => end-fail | 0 | Does nothing for the cause. Example: The attacker returns through the same hole.

### end-win
end: win
text: The mining stopped, but some credentials or evidence were not handled and a repeat is possible.
takeaway: Work through every step of the response. Review the lesson and try again.

### end-ok
end: ok
text: The pod was contained, evidence kept, credentials rotated and the entry point fixed with new detection.
takeaway: Contain first, preserve evidence, rotate, then rebuild and add detection.

### end-fail
end: fail
text: A quick delete hid the cause and the attacker returned.
takeaway: Do not remove evidence or the entry point survives. Review the lesson and try again.
