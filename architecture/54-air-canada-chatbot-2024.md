# Air Canada chatbot gives wrong refund rules, 2024
company: Air Canada
date: February 2024
modules: llm, prompting
calc: error-budget
source: Report on the tribunal decision | https://www.theguardian.com/world/2024/feb/16/air-canada-chatbot-lawsuit
summary: A customer chatbot stated a refund rule that contradicted the airline's policy, and a tribunal held the airline responsible for what its chatbot said.

## Before you read on
A chatbot on your site answers a question about money in confident words that contradict your own policy page. Whose statement is it, and how would you have noticed?

## The system
The airline offered a chatbot on its website to answer customer questions. A customer asked about bereavement fares after the death of a relative. The policy page said such fares had to be requested before travel.

## Timeline as reported
- In 2022 a customer asked the chatbot about bereavement fares and was told he could apply for a partial refund within 90 days after travel.
- He bought the tickets and later requested the refund, which the airline refused because it contradicted the published policy.
- The case went to a Canadian civil resolution tribunal, which issued a decision in February 2024.
- The airline argued that the chatbot was a separate legal entity responsible for its own words, and the tribunal rejected that argument.
- The tribunal found that the airline was responsible for all information on its website and ordered it to pay the customer the difference and some costs.
- The chatbot was later reported to be no longer available on the site.

## Root cause
The chatbot produced a plausible answer that was not grounded in the current policy text, and there was no check that answers about money matched published rules.

## What changed
- The tribunal decision established that a company answers for what its chatbot says to customers.
- The airline withdrew the chatbot from its website according to later reports.

## Lessons learned
- Ground answers in current source text and show the source to the user.
- Route questions about refunds, prices and legal terms to a rule check or a person.
- Log the questions and answers so you can find contradictions with policy.
- Add policy questions to your evaluation set and run it on every change.

## Trade-offs to weigh
- **Helpful answers against exact answers.** Free text feels natural and can be wrong in ways that cost money.
- **Disclaimers against responsibility.** A note saying answers may be wrong does not remove your duty for what you publish.
- **Automation against review.** Reviewing risky answers costs time and prevents liability.

## Try the calculators
In the error budget calculator, see how many wrong answers per thousand a target allows, and why money questions need a much stricter target than small talk.
