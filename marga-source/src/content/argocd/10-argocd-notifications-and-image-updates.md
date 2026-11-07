---
title: Argo CD: notifications and image updates
minutes: 12
summary: Send alerts when syncs fail or apps degrade, and automate image tag updates safely through Git instead of editing clusters.
---

A deployment tool that fails silently is dangerous. And a team that edits version numbers by hand for every release wastes time and makes mistakes. Two small components address these.

## What you will learn

- Triggers, templates and subscriptions in notifications
- Routing alerts by environment and severity
- Automating image tag updates through Git
- Keeping automation reviewable

## Notifications

```yaml
# argocd-notifications-cm (excerpt)
data:
  service.slack: |
    token: $slack-token
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]
  template.app-sync-failed: |
    message: |
      Sync of {{.app.metadata.name}} failed: {{.app.status.operationState.message}}
```

```yaml
# on an Application
metadata:
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: shop-deploys
    notifications.argoproj.io/subscribe.on-health-degraded.slack: shop-deploys
```

A **trigger** decides when, a **template** formats the message and a **subscription** says who receives it. Send routine events to a channel, and page people only for production health problems, to avoid alert fatigue.

## Image updates

The **Argo CD Image Updater** or a pipeline step watches a registry and records a new tag in Git, either by committing to the manifest repository or opening a pull request.

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: web=registry.example.com/shop/web
    argocd-image-updater.argoproj.io/web.update-strategy: semver
    argocd-image-updater.argoproj.io/write-back-method: git
```

Use a version strategy that fits your release process. For production, prefer pull requests with approval, and use digests when you need an exact immutable reference.

## Keep Git as truth

Automatic updates should land as commits so history, review and rollback still work. Never let a tool edit live objects while Git says something else.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Argo CD: notifications and image updates fits together
node: n1 | Notifications | 0 | 0 | A trigger decides when, a template formats the message and a subscription says who receives it. | No notifications for failed syncs. | process
node: n2 | Image updates | 1 | 1 | The Argo CD Image Updater or a pipeline step watches a registry and records a new tag in Git, either by committing to the manifest repository or opening a pull request. | Image updaters that bypass Git. | process
node: n3 | Keep Git as truth | 2 | 0 | Automatic updates should land as commits so history, review and rollback still work. | Never let a tool edit live objects while Git says something else. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The silent Friday failure

> **Incident:** A failed sync was noticed three days later.

```console
phase: Failed
message: ComparisonError: failed to generate manifest
notifications subscribed: none
```

Production deployments failed over the weekend and customers kept seeing the old version. The team added failure notifications to a team channel, paging for production degraded health, and a dashboard of apps out of sync for over an hour.

## Common mistakes

- No notifications for failed syncs
- Paging for every event
- Image updaters that bypass Git
- Using moving tags like latest

```quiz
Q: What decides when a notification is sent?
+ A trigger
- A node :: No.
- A namespace :: No.
- A secret :: No.
> Triggers watch application state.

Q: How should image updates reach clusters?
+ Through commits in Git
- By editing live objects :: No.
- By email :: No.
- By restart :: No.
> Git stays the source of truth.

Q: Why avoid latest tags?
+ They are not reproducible
- They are faster :: No.
- They are secure :: No.
- They are required :: No.
> Use versions or digests.

Q: How avoid alert fatigue?
+ Route by environment and severity
- Send all to everyone :: No.
- Disable alerts :: No.
- Page every sync :: No.
> Be selective. The lesson section above explains why.
```

```cards
Trigger :: Condition that causes a notification
Template :: The format of a notification message
Subscription :: Who gets a notification
Write-back :: Recording a new image tag in Git
```
