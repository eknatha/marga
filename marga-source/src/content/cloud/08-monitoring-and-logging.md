---
title: Cloud monitoring and logging: CloudWatch and Azure Monitor
minutes: 15
summary: Collect metrics, logs and audit trails with CloudWatch, CloudTrail, Azure Monitor and Log Analytics, query them, build alarms and keep retention and cost under control.
---

Every cloud service emits telemetry, but nothing reads it for you. Production needs three things from the platform: **metrics** that show health and capacity, **logs** that explain behaviour, and **audit trails** that record who changed what. Knowing the native tools is the foundation even if you later add Prometheus or a commercial platform.

## What you will learn

- Metrics, logs and audit trails on each cloud
- Querying logs with CloudWatch Logs Insights and KQL
- Creating alarms that notify the right people
- Retention, cost and cross-account collection

## Which service does what

| Purpose | AWS | Azure |
|---------|-----|-------|
| Metrics and alarms | CloudWatch Metrics, Alarms | Azure Monitor Metrics, Alerts |
| Application and system logs | CloudWatch Logs | Log Analytics workspace |
| Audit of API actions | CloudTrail | Activity Log |
| Tracing | X-Ray | Application Insights |
| Dashboards | CloudWatch Dashboards | Workbooks, dashboards |

Metrics are numbers over time with short retention at full resolution. Logs are text events and are far more expensive to store and search. Audit trails are your security record, and must be protected from tampering.

## Metrics and alarms

```console
$ aws cloudwatch list-metrics --namespace AWS/ApplicationELB --metric-name TargetResponseTime | head -20
$ aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=i-0abc123 --start-time 2025-06-02T00:00:00Z --end-time 2025-06-02T06:00:00Z --period 300 --statistics Average
$ aws cloudwatch describe-alarms --state-value ALARM --query 'MetricAlarms[].AlarmName'
$ az monitor metrics list --resource /subscriptions/0000/resourceGroups/rg-shop/providers/Microsoft.Compute/virtualMachines/web-1 --metric "Percentage CPU" --interval PT5M
$ az monitor metrics alert list -g rg-shop -o table
```

A good alarm reflects user impact or imminent failure, has a clear owner, and links to a runbook.

```hcl
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "shop-alb-5xx-rate"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 5
  datapoints_to_alarm = 3
  threshold           = 20
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.oncall.arn]
  ok_actions          = [aws_sns_topic.oncall.arn]
}
```

`datapoints_to_alarm` of 3 out of 5 reduces noise from single spikes. Choose `treat_missing_data` deliberately: for a metric that should always report, missing data should alarm.

## Querying logs

Install an agent or enable the platform integration to ship logs, use structured JSON where possible, and learn the query language.

```text
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as errors by bin(5m)
| sort @timestamp desc
| limit 50
```

That is CloudWatch Logs Insights. The Azure equivalent is **Kusto Query Language (KQL)** in Log Analytics:

```text
AppTraces
| where TimeGenerated > ago(1h) and SeverityLevel >= 3
| summarize errors = count() by bin(TimeGenerated, 5m), AppRoleName
| order by TimeGenerated desc
```

```console
$ aws logs start-query --log-group-name /shop/api --start-time 1748822400 --end-time 1748826000 --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | limit 20'
$ aws logs tail /shop/api --since 30m --follow
$ az monitor log-analytics query -w 00000000-0000-0000-0000-000000000000 --analytics-query "AppTraces | take 10"
```

## Audit trails

CloudTrail and the Azure Activity Log answer security and troubleshooting questions: who deleted this, when did the security group change, which role was assumed.

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteSecurityGroup --max-results 5
$ az monitor activity-log list --offset 24h --query "[?authorization.action=='Microsoft.Network/networkSecurityGroups/delete']" -o table
```

Enable the trail in **every region and account**, send it to a separate, locked-down log archive account with object lock or immutability, and turn on integrity validation. An attacker's first step is often to disable or delete logging.

## Retention and cost

Log ingestion and retention are among the fastest-growing cloud bills.

- Set a retention period on every log group, since the default is often "never expire"
- Sample or drop noisy debug logs in production
- Archive old logs to cheap object storage, and query them with Athena or Azure Data Explorer when needed
- Alert on ingestion volume spikes, since a logging loop can cost thousands of dollars in a weekend

## Incident: the outage nobody was paged for

> **Incident:** Customers cannot check out for 40 minutes before a support ticket reveals it. All dashboards were green. The alarm on instance CPU never fired, and the only alert on the load balancer watched for zero healthy hosts.

The service was up but returning errors. Look at what the platform recorded:

```console
$ aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_5XX_Count --dimensions Name=LoadBalancer,Value=app/shop/abc123 --start-time 2025-06-02T10:00:00Z --end-time 2025-06-02T11:00:00Z --period 60 --statistics Sum
```

The data shows hundreds of 5xx responses per minute starting at 10:12. Infrastructure alarms measured resources, not user experience. Add alarms on error rate and latency, an alarm on missing data, a synthetic checkout probe from outside, and route alerts to the on-call rotation with a runbook link.

## Common mistakes

- Alarms only on CPU and disk, none on errors and latency
- Logs with unlimited retention and no budget alerts
- Audit trail in the same account that attackers can modify
- Unstructured logs that cannot be queried
- Alerts that go to an email nobody watches

```quiz
Q: Which service records who made API calls in an AWS account?
- CloudWatch Metrics
+ CloudTrail
- X-Ray
- Route 53
> CloudTrail is the audit trail of management actions.

Q: What is KQL?
- A kind of database
+ The query language used in Azure Monitor Log Analytics
- A Kubernetes tool
- A billing report
> It lets you filter, summarise and chart log data.

Q: Why set retention on every log group?
- Required by AWS
+ Defaults may keep logs forever, which grows cost without value
- It speeds up queries
- It encrypts logs
> Choose retention to match need and compliance, then archive or delete.

Q: What should a good alarm be based on?
+ User-visible symptoms such as error rate and latency, as well as imminent resource failure
- Only CPU usage
- Only disk space
- Random sampling
> Resource-only alarms miss failures that users actually feel.
```

```cards
CloudWatch Logs Insights versus KQL? :: Query languages for AWS and Azure log data respectively
Why ship audit logs to another account? :: So an attacker in the workload account cannot erase evidence
datapoints_to_alarm purpose? :: Require several breaching points before alarming, reducing noise
Cheap long-term log option? :: Archive to object storage and query on demand
```
