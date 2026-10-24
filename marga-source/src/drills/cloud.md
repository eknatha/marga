## Private instances cannot reach the internet
level: junior
Servers in a private subnet cannot download updates.

```text
$ curl -m 5 https://repo.example.org
curl: (28) Connection timed out after 5001 milliseconds

Route table rtb-0a1 (private subnet)
Destination       Target
10.0.0.0/16       local
```
? What is missing?
+ A route for 0.0.0.0/0 that points to a NAT gateway placed in a public subnet
- A bigger instance type
- An internet gateway attached to the private subnet itself
- A second security group on the instance
why: The private route table only has the local route. Instances need a default route to a NAT gateway, which sits in a public subnet whose own route table points to an internet gateway. Also check that security groups and network ACLs allow outbound traffic and the return traffic. For AWS services, VPC endpoints avoid NAT charges.

## AccessDenied although the IAM policy allows it
level: mid
A role has an allow policy for s3:GetObject, and still the request fails.

```text
An error occurred (AccessDenied) when calling the GetObject operation:
User: arn:aws:sts::111122223333:assumed-role/report-reader/job is not authorized
to perform: s3:GetObject on resource: arn:aws:s3:::finance-archive/2026/q3.csv
with an explicit deny in a resource-based policy
```
? Where is the block?
+ A deny statement in the bucket policy, which overrides the role's allow
- The role needs a longer session duration
- The object is in the wrong storage class
- The role does not exist
why: In AWS an explicit deny always wins over any allow. The message names a resource-based policy, which is the bucket policy. Inspect it for conditions such as source VPC endpoint, IP range or required encryption. Other layers that can deny include service control policies, permissions boundaries and KMS key policies.

## The bill doubled with the same traffic
level: mid
A monthly cost report shows a sharp rise in one line item.

```text
Service            Usage type                    Cost
EC2-Other          NatGateway-Bytes              $4,820
EC2-Other          NatGateway-Hours              $97
S3                 Requests-Tier1                $31
# Most of the bytes are from pods pulling container images
# and reading a large S3 bucket in the same region.
```
? What change is the most effective?
+ Add VPC endpoints for S3 and for the container registry so that traffic does not go through the NAT gateway
- Buy a larger NAT gateway
- Turn off logging
- Move the bucket to a different storage class
why: NAT gateways charge per gigabyte processed. Traffic to S3 and to some other AWS services can use a gateway or interface endpoint instead, which avoids the NAT data processing charge. Review the cost by usage type, tag resources, and set budget alerts so a rise is noticed within days.

## Storage bucket open to the world
level: junior
A security scanner reports that a bucket with customer exports is readable by anyone.

```text
$ aws s3api get-bucket-policy --bucket acme-exports
{"Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::acme-exports/*"}]}

$ aws s3api get-public-access-block --bucket acme-exports
NoSuchPublicAccessBlockConfiguration
```
? What should you do first?
+ Turn on the public access block for the bucket, replace the policy with named principals, and check the access logs for reads by unknown parties
- Rename the bucket
- Delete the scanner finding
- Wait for the next audit
why: Principal "*" lets anyone read every object. Block public access stops it at once and acts as a guard against later mistakes. Then restrict the policy to the roles that need it, and review the access logs to learn whether data was taken, because that decides whether you must notify anyone.

## Bill doubled with no new traffic
level: mid
The monthly cloud bill is twice as high as last month. Request counts are flat.

```text
Cost by service (this month vs last):
  EC2 instances      $4,100 vs $4,000
  NAT gateway data   $5,900 vs $600
  S3 storage         $  800 vs $  780
```
? Which investigation is the best next step?
+ Find which workloads send large volumes of data through the NAT gateway, for example with flow logs, and use gateway endpoints or private paths for storage and registry traffic
- Resize every EC2 instance
- Move the S3 buckets to another region
- Turn off the load balancer
why: The jump is in NAT gateway data processing, which costs per gigabyte. A change such as a new job pulling large images or objects over the internet path can cause it. Flow logs show the source and destination. VPC endpoints for object storage and the container registry remove that traffic from the NAT gateway.
