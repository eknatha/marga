---
title: Senior skills: interviewing and hiring as the interviewer
minutes: 11
summary: Run fair, structured technical interviews for platform and SRE roles with clear criteria, good questions, calibrated scoring and a respectful candidate experience.
---

Hiring is one of the highest-leverage things a senior engineer does. A weak process rejects good people and admits poor fits, and costs the team for years. Structure, shared criteria and respect for the candidate make interviews both fairer and more accurate.

## What you will learn

- Define what the role needs before you ask a question
- Design questions that reveal how a person works
- Score against criteria and avoid common biases
- Keep the candidate experience professional

## Start with the role

Write what success looks like at six and twelve months, and turn it into three to five **competencies**: for example troubleshooting, system design, automation, communication and incident judgment, with expected depth for the level. Each interviewer owns different competencies, so the panel covers the role without repeating questions. Agree on what a strong, acceptable and weak answer looks like **before** the interviews.

## Questions that show how someone thinks

Prefer realistic scenarios over trivia: "A service's latency doubled at 14:00. Walk me through what you do." Listen for method (scope the problem, form hypotheses, check the cheapest signals first, communicate), not for a single correct answer. Use follow-up probes to go deeper: "What would you look at next if the CPU is fine?" For design, give a small, concrete problem and let the candidate ask questions. For hands-on skill, a short realistic exercise (read a log, fix a failing script) beats whiteboard puzzles. Ask about past incidents: what they did, what they would change, what they learned. Accept different valid approaches.

```yaml
scorecard:
  role: "Platform engineer, L4"
  competencies:
    troubleshooting:
      strong: "Forms hypotheses, tests cheaply, narrows quickly, explains reasoning"
      acceptable: "Reaches the cause with some guidance"
      weak: "Guesses randomly or changes many things at once"
    communication:
      strong: "Clear, checks understanding, states uncertainty"
      weak: "Vague, defensive, or unable to explain choices"
  rule: "Write notes during the interview; score within 24 hours; do not discuss before submitting"
```

## Score fairly

Take notes of what was said and done, not impressions. Submit your score **before** talking to other interviewers, to avoid anchoring on the loudest opinion. Watch for biases: liking people who resemble you, favoring a famous employer, judging confidence over competence, and the "halo" from one great answer. Ask "what evidence do I have?" for each competency. Decide on the evidence against the criteria, and give a clear recommendation with reasons. Review outcomes later: do your scores predict performance?

## The candidate's experience

Be on time, introduce yourself and the format, explain what you will do and leave time for their questions. Give hints when someone is stuck, since you are measuring ability, not the ability to cope with stress. Do not ask illegal or irrelevant personal questions. Give feedback quickly, and be kind and honest in rejections. Candidates who feel respected speak well of the company even when they do not join, and your process is the first view they get of how the team works.

```predict
Q: Three interviewers share their impressions in a group chat before submitting scores. What is the risk?
???
Anchoring and groupthink: later opinions bend toward the first strong view. Submit independent written scores first, then discuss differences.
> Independent evidence before discussion.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Senior skills: interviewing and hiring as the... fits together
node: n1 | Start with the role | 0 | 0 | Write what success looks like at six and twelve months, and turn it into three to five competencies: for example troubleshooting, system design, automation... | Discussing before submitting scores. | process
node: n2 | Questions that show how someone | 1 | 1 | Prefer realistic scenarios over trivia: "A service's latency doubled at 14:00. | Judging on trivia and gut feeling. | process
node: n3 | Score fairly | 2 | 0 | Take notes of what was said and done, not impressions. | Submit your score before talking to other interviewers, to avoid anchoring on the loudest opinion. | process
node: n4 | The candidate's experience | 3 | 1 | Be on time, introduce yourself and the format, explain what you will do and leave time for their questions. | A poor candidate experience. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The brilliant jerk who nearly got hired

> **Incident:** A candidate impressed one interviewer so much with trivia that the panel overlooked repeated signs of poor collaboration in other rounds.

```console
$ grep -i "talked over\|dismissive\|would not explain" interview-notes/*.txt | wc -l
5
$ grep -c "strong hire" interview-notes/*.txt
1
```

Five separate interviewers had written concerns about collaboration, but the first interviewer's enthusiasm dominated the debrief. The hiring manager noticed the pattern in the notes and asked the panel to weigh evidence against the written criteria. The team passed on the candidate. Afterward they added collaboration as an explicit competency with its own scoring, and made the independent-scoring rule mandatory.

## Common mistakes

- Asking whatever comes to mind
- Judging on trivia and gut feeling
- Discussing before submitting scores
- A poor candidate experience

```quiz
Q: Why define a scorecard before the interviews?
+ So everyone judges against the same criteria
- To speed up lunch :: Unrelated.
- To avoid taking notes :: Opposite.
- To hide results :: Opposite.
> Shared criteria reduce bias.

Q: Which question type reveals working style best?
+ A realistic scenario with follow-up probes
- Obscure trivia :: Tests memory.
- Brain teasers :: Little relation to work.
- Yes or no questions :: Reveal little.
> See how the candidate thinks.

Q: Why submit scores before the group discussion?
+ To avoid anchoring on the first or loudest opinion
- To lose notes :: Opposite.
- To end faster :: Not the reason.
- To skip the debrief :: Still needed.
> Independent evidence first.

Q: What should you do if a candidate is stuck?
+ Offer a hint and see how they use it
- Mark them down immediately :: Unfair.
- End the interview :: Unhelpful.
- Give the full answer :: Defeats the measure.
> Measure ability, not panic.
```

```cards
Competencies :: 3 to 5 skills the role needs, defined with levels
Scenario question :: realistic problem with follow-up probes
Independent scoring :: write your score before discussing
Bias check :: what evidence supports this score
Candidate experience :: on time, clear, respectful, quick feedback
```
