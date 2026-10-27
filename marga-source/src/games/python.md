## The report job that never finished
module: python
level: Intermediate
minutes: 6
lesson: python/http-apis-and-json
summary: A nightly Python job is stuck and the next one is blocked. Find where it hangs and make it safe.
intro: At 11:00 the finance team asks why the nightly report has not arrived. The job started at 01:00 and normally takes ten minutes. It is still listed as running.

### s1
text: The process has been running for ten hours. CPU use is near zero. What do you do first?
- Kill it and start it again => s3 | 1 | It gets the report out, but you lose the chance to see where it was stuck, and it may hang again. Example: Killing the hung report job at 09:00 produces the report, but next week the same call hangs again and nobody knows which server causes it.
- Look at where it is stuck with py-spy dump or a similar tool before killing it => s2 | 2 | A stack dump shows the exact line the program is waiting at. Example: py-spy dump --pid 4321 prints a stack ending in socket.recv in fetch_page, so you know the job is waiting on the network, not computing.
- Wait another hour => end-fail | 0 | A program using no CPU for ten hours is not about to finish. Example: top shows the process at 0 percent CPU for ten hours. Waiting longer only delays the report, because a call stuck in recv does not time itself out.

### s2
text: py-spy shows the main thread in a socket receive call inside requests, called from fetch_page at line 41. What does this suggest?
- The program is waiting for a network reply, probably with no timeout set => s4 | 2 | That is the typical cause of a silent hang. Example: requests.get(url) without timeout= can wait forever for a server that accepted the connection and never answered.
- A bug in the report calculation => s3 | 0 | The stack shows network waiting, not calculation. Example: A calculation bug would use CPU and usually raise an exception. A flat 0 percent CPU and a stack in socket.recv is a wait, not arithmetic.
- The disk is full => s3 | 0 | A full disk would produce errors, not a wait in a socket call. Example: A full disk gives OSError: [Errno 28] No space left on device. It does not leave a process quietly sleeping in a network read.

### s3
text: You kill the process and start it again. The report is partly produced, and ten minutes later the job is stuck at the same place. You need the cause. What next?
- Capture a stack dump this time and read the code around the stuck call => s2 | 2 | Evidence first. Now you can see the exact line. Example: Next run, py-spy dump shows the line requests.get(f'{api}/page/{n}'), so you can read the code around it and see no timeout is set.
- Run the job under a different user => end-fail | 0 | This is not related to the problem and wastes time. Example: Running the job as another user changes file permissions, not network behaviour, so the hang remains and you lose another hour.

### s4
text: In the code, fetch_page calls requests.get(url) with no timeout, to an internal inventory service. The service had a maintenance window last night. How do you fix the code?
- Set a connect and read timeout, such as timeout=(3, 15), and retry a limited number of times with a short wait => s5 | 2 | Timeouts stop one slow server from blocking the job, and limited retries handle short faults. Example: requests.get(url, timeout=(3, 15)) fails after 3 seconds to connect or 15 seconds with no data, and a loop of three tries with a 2 second pause covers short outages.
- Add a very long timeout, such as one hour => s5 | 0 | A very long timeout is almost the same as none. Example: timeout=3600 means one stuck page can still delay the whole report for an hour, so it behaves almost like no timeout.
- Wrap it in try and ignore all errors => s5 | 0 | Hidden errors produce incomplete reports without anyone knowing. Example: try: fetch(page) except Exception: pass leaves a hole in the totals and nobody reads an error, so finance may act on wrong numbers.

### s5
text: The job needs to deal with the page that fails after retries. What should it do?
- Log the failure with the page and reason, continue, and fail the job at the end with a clear list of problems => s6 | 2 | The report is as complete as possible, and the failure is visible. Example: logging.error('page %d failed: %s', n, exc), keep the page number in a failed list, and at the end raise SystemExit('failed pages: 7, 12') so the scheduler marks the run failed.
- Continue silently and produce a report with missing data => end-fail | 0 | Finance would use incomplete data without knowing. Example: A report that quietly misses pages 7 and 12 shows revenue 4 percent too low, and nobody knows until the numbers are compared by hand.

### s6
text: The fixed job works. What else will stop one hung run from blocking the next night?
- A lock file with a maximum run time, an alert if the job exceeds twice its usual duration, and a test with a server that never answers => end-win | 2 | You limit the damage of a hang and detect it early, and the test proves the timeout works. Example: fcntl.flock on /var/run/report.lock stops two copies running, an alert fires if the job runs longer than 2x its usual 10 minutes, and a test server using time.sleep(60) proves the timeout triggers.
- Just restart the job manually whenever it is late => end-ok | 1 | It works but depends on someone noticing every time. Example: Restarting by hand works until the person who watches the clock is on leave, and then finance gets no report for a day.

### end-win
end: win
text: The report arrives on time, a late job raises an alert, and a test proves that a silent server cannot block the job again.
takeaway: Every network call needs a timeout. When a program hangs, take a stack dump before you kill it, and alert when a job runs much longer than normal.

### end-ok
end: ok
text: The immediate problem is solved, but the process still depends on a person noticing a late job.
takeaway: Monitoring the duration of batch jobs turns a silent hang into a quick alert.

### end-fail
end: fail
text: The report was late or wrong. The finance team lost a day, and the same hang is waiting to happen again.
takeaway: Do not wait for a silent job, and never hide errors. Find where it is stuck and fix the cause.
