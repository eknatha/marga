## Someone resized the server by hand
id: tf-drift-instance-size
module: terraform
level: Beginner
minutes: 10
lesson: terraform/workflows-and-drift
engine: Simulated Terraform in a project folder
summary: Plan shows a change nobody wrote in code. Read the drift, decide what the code should say, and bring the real server back in line.
@@ story
The web server was resized in the cloud console during an incident last night, but the Terraform code still says t3.small. Before the next release you want the code and the real server to agree again. The decision is already made: the code is right and the server goes back to t3.small.
@@ goals
- Run terraform plan and read what Terraform sees.
- Apply so the real server matches the code.
- Leave main.tf unchanged.
@@ hints
- `terraform plan` compares the code, the state and the real server. Read the note about changes made outside Terraform.
- The plan proposes to change instance_type from t3.large back to t3.small. That is what you want.
- `terraform apply -auto-approve` runs the change without a prompt in this simulator. Run plan again to prove there is nothing left.
@@ file /home/user/infra/main.tf
terraform {
  required_version = ">= 1.5"
}

provider "aws" {
  region = "eu-west-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0abc123"
  instance_type = "t3.small"
}

@@ world
{"cwd": "/home/user/infra", "more": {"tf": {"state": {"aws_instance.web": {"ami": "ami-0abc123", "instance_type": "t3.small"}}, "real": {"aws_instance.web": {"instance_type": "t3.large"}}, "init": true}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan reports no changes",
  "out": "No changes"
 },
 {
  "t": "contains",
  "path": "/home/user/infra/main.tf",
  "label": "main.tf still says t3.small",
  "text": "\"t3.small\""
 }
]
@@ explain
Drift is any difference between what the code describes and what really exists. Plan refreshes the real values first and shows the difference. Apply makes the real server match the code. If the manual change had been right, the answer would be to update the code instead, so always decide which side is correct before you apply.
@@ solution
terraform plan
terraform apply -auto-approve
terraform plan


## Plan stops: no value for a variable
id: tf-missing-variable
module: terraform
level: Beginner
minutes: 10
lesson: terraform/variables-and-outputs
engine: Simulated Terraform in a project folder
summary: A plan fails because a required variable has no value. Provide it in a tfvars file the way a team would, not on every command.
@@ story
A colleague added a variable named environment with no default. Now terraform plan refuses to run. The staging value is staging. Put it in a file so every run, local or in a pipeline, picks it up.
@@ goals
- See the error from terraform plan.
- Create terraform.tfvars with environment set to staging.
- Make terraform plan succeed and show the bucket it will create.
@@ hints
- `terraform plan` names the variable that has no value.
- Terraform reads terraform.tfvars automatically. The format is `name = "value"`.
- `echo 'environment = "staging"' > terraform.tfvars` creates the file. Run plan again.
@@ file /home/user/infra/main.tf
variable "environment" {
  type = string
}

resource "aws_s3_bucket" "logs" {
  bucket = "shop-logs-${var.environment}"
}

@@ world
{"cwd": "/home/user/infra", "more": {"tf": {"state": {}, "real": {}, "init": true}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/infra/terraform.tfvars",
  "label": "tfvars sets environment to staging",
  "re": "environment\\s*=\\s*\"staging\""
 },
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan succeeds and creates the bucket",
  "out": "1 to add"
 }
]
@@ explain
A variable without a default is required. The value can come from -var on the command line, a .tfvars file or an environment variable named TF_VAR_name. A terraform.tfvars file is loaded automatically, so it keeps runs repeatable and out of shell history. Never put secrets in a file that is committed.
@@ solution
terraform plan
echo 'environment = "staging"' > terraform.tfvars
terraform plan


## A rename that would destroy the server
id: tf-rename-moved
module: terraform
level: Intermediate
minutes: 12
lesson: terraform/import-refactor-and-moved-blocks
engine: Simulated Terraform in a project folder
summary: Renaming a resource in code makes Terraform plan to destroy and create it. Tell Terraform it is the same object with a moved block.
@@ story
You renamed the resource from web to app so the names match your service. The plan now wants to destroy the running server and create a new one. The server must keep running. Teach Terraform that the old address and the new one are the same object.
@@ goals
- Run terraform plan and read the destroy and create.
- Add a moved block from aws_instance.web to aws_instance.app.
- Reach a plan that reports no changes.
@@ hints
- Terraform tracks objects by address. A new address looks like a new object, and the old address looks like something removed.
- A moved block says: from the old address, to the new address. It sits in the code like any other block.
- `printf 'moved {\n  from = aws_instance.web\n  to   = aws_instance.app\n}\n' >> main.tf` adds it. Plan again.
@@ file /home/user/infra/main.tf
resource "aws_instance" "app" {
  ami           = "ami-0abc123"
  instance_type = "t3.small"
}

@@ world
{"cwd": "/home/user/infra", "more": {"tf": {"state": {"aws_instance.web": {"ami": "ami-0abc123", "instance_type": "t3.small"}}, "real": {"aws_instance.web": {"instance_type": "t3.small"}}, "init": true}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/infra/main.tf",
  "label": "a moved block exists",
  "re": "moved\\s*\\{[\\s\\S]*from\\s*=\\s*aws_instance\\.web[\\s\\S]*to\\s*=\\s*aws_instance\\.app"
 },
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan does not destroy anything",
  "notOut": "will be destroyed|[1-9][0-9]* to destroy"
 },
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan shows no create",
  "notOut": "will be created"
 }
]
@@ explain
State maps addresses in code to real objects. If the address changes, Terraform concludes that the old object is gone and a new one is wanted. A moved block records the rename in code, so teammates and pipelines get the same result. The older way is terraform state mv, which edits one state file and is easy to forget.
@@ solution
terraform plan
printf 'moved {\n  from = aws_instance.web\n  to   = aws_instance.app\n}\n' >> main.tf
terraform plan


## SSH is open to the world in code
id: tf-open-ssh
module: terraform
level: Beginner
minutes: 10
lesson: terraform/debugging-terraform
engine: Simulated Terraform in a project folder
summary: The security group allows SSH from anywhere. Fix it in code, then apply so the real group changes too.
@@ story
A review found that the web security group lets the whole internet try SSH. The office range is 203.0.113.0/24. Change the code, apply it, and prove that the plan is clean afterwards.
@@ goals
- Replace 0.0.0.0/0 in main.tf with the office range 203.0.113.0/24.
- Apply the change.
- Finish with a plan that reports no changes.
@@ hints
- `grep -n cidr main.tf` shows the line.
- `sed -i 's#0.0.0.0/0#203.0.113.0/24#' main.tf` edits it in place.
- Run `terraform plan`, then `terraform apply -auto-approve`, then plan again.
@@ file /home/user/infra/main.tf
resource "aws_security_group" "web" {
  name = "web-sg"
  ingress {
    from_port   = 22
    cidr_blocks = ["0.0.0.0/0"]
  }
}

@@ world
{"cwd": "/home/user/infra", "more": {"tf": {"state": {"aws_security_group.web": {"name": "web-sg", "from_port": 22, "cidr_blocks": ["0.0.0.0/0"]}}, "real": {}, "init": true}}}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/infra/main.tf",
  "label": "main.tf no longer opens 0.0.0.0/0",
  "text": "0.0.0.0/0",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/infra/main.tf",
  "label": "main.tf allows the office range",
  "text": "203.0.113.0/24"
 },
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan is clean after apply",
  "out": "No changes"
 }
]
@@ explain
A change in code does nothing until it is applied. The plan shows the in-place update of the rule, and the final plan proves that code, state and real group agree. Restricting a management port to known ranges is one of the cheapest security fixes there is.
@@ solution
grep -n cidr main.tf
sed -i 's#0.0.0.0/0#203.0.113.0/24#' main.tf
terraform plan
terraform apply -auto-approve
terraform plan


## Hand an old bucket to another team without destroying it
id: tf-state-rm-handoff
module: terraform
level: Intermediate
minutes: 12
lesson: terraform/state
engine: Simulated Terraform in a project folder
summary: The bucket moved to another team's stack. Remove it from this state so Terraform stops managing it, without deleting it.
@@ story
The legacy-uploads bucket is now managed by the data team in their own Terraform project, and you deleted its block from this code. Terraform now wants to destroy the bucket, which would delete customer files. Remove it from this project's state only.
@@ goals
- Run terraform plan and see the proposed destroy.
- Remove aws_s3_bucket.legacy from the state without destroying it.
- Finish with a plan that reports no changes.
@@ hints
- `terraform state list` shows what this project manages.
- `terraform state rm ADDRESS` forgets the object. It does not delete the real bucket.
- Run `terraform plan` again. Nothing should be left to destroy.
@@ file /home/user/infra/main.tf
resource "aws_s3_bucket" "assets" {
  bucket = "shop-assets"
}

@@ world
{"cwd": "/home/user/infra", "more": {"tf": {"state": {"aws_s3_bucket.legacy": {"bucket": "legacy-uploads"}, "aws_s3_bucket.assets": {"bucket": "shop-assets"}}, "real": {"aws_s3_bucket.legacy": {"bucket": "legacy-uploads"}, "aws_s3_bucket.assets": {"bucket": "shop-assets"}}, "init": true}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "terraform state list",
  "code": 0,
  "label": "legacy is no longer in state",
  "notOut": "legacy"
 },
 {
  "t": "cmd",
  "run": "terraform state list",
  "code": 0,
  "label": "assets is still managed",
  "out": "aws_s3_bucket\\.assets"
 },
 {
  "t": "cmd",
  "run": "terraform plan",
  "code": 0,
  "label": "plan reports no changes",
  "out": "No changes"
 }
]
@@ explain
State is Terraform's memory of what it manages. Removing code makes Terraform think you want the object gone. state rm tells Terraform to forget an object while leaving it alone in the cloud, which is the safe way to hand it over. The new owner then imports it into their own state.
@@ solution
terraform plan
terraform state list
terraform state rm aws_s3_bucket.legacy
terraform plan

