## The prune that removed everything
module: argocd
level: Intermediate
minutes: 7
lesson: argocd/sync-health-and-drift
summary: After a folder rename, an automated application deleted its resources. Recover and add protection.
intro: A pull request renamed the folder apps/shop-api. Ten minutes after merge, the shop-api pods disappear and the application shows OutOfSync with prune enabled.

### s1
text: Resources are disappearing. What is your first move?
- Pause automated sync for the application and read the diff and the source path => s2 | 2 | Stop the damage and find the cause. Example: argocd app diff shows the source path does not exist.
- Re-run sync repeatedly => s2 | 1 | It repeats the bad state. Example: More resources are pruned.
- Delete the application object => s2 | 0 | It may delete everything it manages. Example: The namespace empties.

### s2
text: The path no longer matches the folder. What do you do?
- Fix the path in the Application or revert the rename, then sync => s3 | 2 | Restore the desired state. Example: Sync recreates the deployment and services.
- Disable health checks => s3 | 1 | They are not the problem. Example: The app is still missing.
- Copy files into the cluster by hand => s3 | 0 | The controller would revert them. Example: Self-heal removes them.

### s3
text: Given what you have found so far: How do you protect against a repeat?
- Render manifests in a pull request check, set Prune=false on stateful resources and review structural changes => end-win | 2 | Detect and cap the risk. Example: CI renders every application and fails on an empty result.
- Turn prune on everywhere => end-ok | 1 | More risk. Example: The next rename deletes more.
- Ban folder renames forever => end-fail | 0 | Impractical. Example: Teams work around it.

### end-win
end: win
text: The application is restored and renames are checked before they can delete anything.
takeaway: Pause, read the diff, fix the path, and add render checks and Prune=false for critical resources.

### end-ok
end: ok
text: The application is back, but a rename could still cause damage.
takeaway: Recover first, then protect. Use this in your own work.

### end-fail
end: fail
text: Resources stay deleted and the team cannot tell why.
takeaway: Automation with prune needs guardrails.


## The application that never synced
module: argocd
level: Intermediate
minutes: 7
lesson: argocd/debugging-argo-cd
summary: A new application stays Unknown and will not sync. Walk the stages to find the cause.
intro: You created an Application for a private repository. It shows Unknown with a comparison error and nothing is deployed.

### s1
text: The status is Unknown with a comparison error. Where do you start?
- Run argocd app get to read the condition, then check the four stages in order => s2 | 2 | The condition names the failing stage. Example: It says authentication required, which is the fetch stage.
- Reinstall Argo CD => s2 | 1 | Overkill. Example: The error returns.
- Change the destination namespace => s2 | 0 | Unrelated to fetching. Example: Same error.

### s2
text: The repository needs a credential. What do you add?
- A read-only credential registered for that repository => s3 | 2 | Least privilege. Example: A deploy token with read access is added.
- An administrator token for the whole organisation => s3 | 1 | Far too broad. Example: A leak would expose everything.
- Make the repository public => s3 | 0 | Exposes private configuration. Example: Internal details become public.

### s3
text: It now fetches but the render fails. How do you debug it?
- Run helm template or kustomize build locally with the same values => end-win | 2 | Reproduce the render outside the cluster. Example: Local output shows a missing value.
- Edit live resources => end-ok | 1 | There are none yet. Example: Nothing to edit.
- Disable the repo server => end-fail | 0 | It does the rendering. Example: Nothing renders.

### end-win
end: win
text: The application syncs and you know the four stages to check next time.
takeaway: Walk fetch, render, apply and health in order, with least-privilege credentials.

### end-ok
end: ok
text: The application works now, but you guessed at some steps.
takeaway: Fix the cause, then learn the stages.

### end-fail
end: fail
text: The application stays Unknown and nothing is delivered.
takeaway: Debugging by stage finds the problem faster than guessing.

