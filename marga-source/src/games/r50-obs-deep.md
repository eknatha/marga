## The alert nobody trusted
module: obs-deep
level: Advanced
minutes: 7
lesson: obs-deep/observability-as-code-and-cost-control
summary: A noisy alert was muted, then a real outage went unnoticed. Rebuild the alerting.
intro: The on call engineer muted a flapping CPU alert last month. Today users report errors and no page fired. You are asked to fix the alerting.

### s1
text: Where do you start? Choose the best next step.
- Find what users experienced and define an SLO and error budget for it => s2 | 2 | Alerts should reflect user impact. Example: The checkout success rate becomes the SLO.
- Add more CPU alerts => s2 | 1 | More of the same noise. Example: Ten more CPU alerts fire for no user impact.
- Mute everything until it is quiet => end-fail | 0 | You lose all signals. Example: The next outage is missed again.

### s2
text: How do you page on the SLO? Choose the best next step.
- Use multiwindow burn rate alerts, with a fast and a slow tier => s3 | 2 | Fast burns page and slow burns ticket. Example: A 14.4 burn rate over one hour and five minutes pages.
- Page when errors exceed one in a minute => s3 | 1 | Short spikes cause noise. Example: A single retry storm pages at night.
- Check the dashboard daily => end-fail | 0 | Humans are not alerts. Example: The outage runs for hours before the morning check.

### s3
text: How do you keep alerts quiet and useful?
- Group and route by service and add a runbook link to every alert => s4 | 2 | Context speeds the response. Example: The page links to the checkout runbook.
- Send all alerts to one channel => s4 | 1 | Hard to see what matters. Example: The channel fills with hundreds of messages.
- Delete the runbooks => end-fail | 0 | No help for responders. Example: The responder guesses.

### s4
text: How do you prove the new alerting works?
- Test the rules with promtool and run a game day that breaks a dependency => end-win | 2 | Tests show rules fire when they should. Example: The game day pages within two minutes.
- Trust the configuration => end-ok | 1 | Untested rules fail silently. Example: A typo means the alert never fires.
- Wait for a real outage => end-fail | 0 | Too costly. Example: Users find the problem first.

### end-win
end: win
text: The alerts now follow user impact, page quickly on real burns and were proven in a game day.
takeaway: Alert on the user experience, with burn rates and a tested rule set.

### end-ok
end: ok
text: Some noise was cut but user impact is still only partly covered.
takeaway: Tie every page to an SLO and test the rules. Review the lesson and try again.

### end-fail
end: fail
text: The alerts stayed noisy or silent and the next outage went unnoticed again.
takeaway: Do not mute signals or rely on people to watch dashboards. Review the lesson and try again.
