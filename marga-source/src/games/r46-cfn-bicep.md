## The update that replaced the database
module: cfn-bicep
level: Advanced
minutes: 7
lesson: cfn-bicep/stacks-change-sets-and-safe-updates
summary: A CloudFormation update replaced a production database with an empty one. Recover the data and make the process safe.
intro: At 10:05 an engineer applied a small template change to the production stack. The application now reports that every table is empty. The database resource shows a new physical id, and automated snapshots exist from last night.

### s1
text: The application reports empty tables right after a stack update. What is your first move?
- Check the stack events and the physical id of the database to confirm it was replaced => s2 | 2 | Confirm the cause before acting. Example: describe-stack-events shows Database UPDATE_COMPLETE with a new physical resource id, and the old instance is in deleting state.
- Run the update again to fix it => s3 | 0 | Re-running the update will not bring back the old database and may replace it again. Example: A second update creates yet another empty instance and the original data stays gone.
- Delete the stack and start again => end-fail | 0 | Deleting the stack removes more resources and any remaining chance of recovery from it. Example: The delete removes the new database too, and the old snapshot is the only copy left.

### s2
text: The database was replaced by the update. What is the safest recovery path?
- Find the latest snapshot and restore it to a new instance, then point the application at it => s4 | 2 | Snapshots are the way back. Example: aws rds describe-db-snapshots lists rds:orders-2026-11-05-02-00, and restore-db-instance-from-db-snapshot creates orders-restored.
- Wait for the old database to come back by itself => s3 | 0 | A deleted instance does not return. Example: The old instance finishes deleting within minutes and its storage is released.
- Re-create the data by hand from the application logs => s3 | 0 | Logs rarely contain full records and this takes days. Example: The application logs hold order ids but not the line items, so most rows cannot be rebuilt.

### s3
text: Time is passing and the data is still missing. What do you do?
- Return to the snapshot list and begin the restore now => s2 | 2 | A restore is the only real option. Example: describe-db-snapshots confirms last night's automated snapshot, and the restore is started within a minute.
- Escalate to a vendor and wait for their reply => end-fail | 0 | Waiting costs hours while the restore can start now. Example: The vendor answers the next morning and the orders placed in between are lost.

### s4
text: The restored database is online. The stack still wants to own the old resource. How do you bring the stack back in line?
- Import the restored instance into the stack with a resource import change set, with snapshot policies set first => s5 | 2 | Import returns the resource to code control without recreating it. Example: A resource import change set maps Database to orders-restored and the next drift detection reports IN_SYNC.
- Edit the stack outside CloudFormation and ignore drift => end-ok | 1 | Service works, but the code no longer describes production. Example: The next unrelated update tries to replace the instance again because the template and reality differ.

### s5
text: Service is back. Which lasting changes prevent a repeat?
- Add DeletionPolicy and UpdateReplacePolicy Snapshot, require a reviewed change set, and run a restore rehearsal => end-win | 2 | Protect the data, force a preview and practise recovery. Example: A pipeline step fails when a change set shows Replacement True on a stateful resource without an approval, and a quarterly restore test records the time to recover.
- Tell engineers to be more careful => end-fail | 0 | Care without a gate fails the next busy day. Example: Three weeks later another property change forces replacement and nothing stops it.

### end-win
end: win
text: The data is restored, the stack is back under code control, and a gate stops stateful replacement from reaching production unreviewed.
takeaway: Recover from the snapshot, import the resource and add policy and review gates.

### end-ok
end: ok
text: Service works again, but code and production no longer agree.
takeaway: Bring recovered resources back under code control.

### end-fail
end: fail
text: Data stays lost or more resources are destroyed.
takeaway: Never re-run or delete a stack hoping to repair a replacement.
