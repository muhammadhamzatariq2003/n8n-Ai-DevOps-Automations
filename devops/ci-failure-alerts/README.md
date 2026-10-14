# GitHub CI Failure Alerts

> A failed GitHub Actions run becomes a Slack message with everything needed to react.

|  |  |
|---|---|
| **Starts when** | Webhook, `POST /webhook/github-ci-alerts`, registered as a GitHub **Workflow runs** webhook |
| **You need** | Slack Account |
| **Cost** | No AI calls, free to run |
| **Workflow file** | `ci-failure-alerts.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **Slack Account** | Slack API | In your Slack app (api.slack.com/apps) copy the **Bot User OAuth Token** (`xoxb-...`) into a new **Slack API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a Slack app with the bot scope `chat:write`, install it, and invite the bot to your alerts channel.
2. Create the **Slack API** credential in n8n.
3. Import `ci-failure-alerts.json`, assign the credential to **Post to Slack**, and set `slackChannel` in **Settings**.
4. Activate the workflow, copy the **Production URL** of **GitHub Webhook**.
5. In GitHub: repo **Settings, Webhooks, Add webhook**, content type `application/json`, event **Workflow runs**.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `slackChannel` | `engineering-alerts` | Channel name (without `#`) or channel ID. |
| `allowedRepos` | empty | Comma-separated `owner/repo` list. Empty means any repository that sends events. |

## What you get

```
🔴 CI failure
Workflow: Build and Test
Repo: acme/backend   Branch: `feature/new-auth`
Commit: `a3f92bc` — Add JWT token refresh logic
Triggered by: alice
View run                                   (links to the run)
```
Timed-out runs show 🟠 *CI timed out*, and re-runs mention the attempt number.

## Built-in safeguards

Only `completed` runs with a `failure` or `timed_out` result produce a message, so the channel stays quiet when things work.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **GitHub Webhook** | Webhook | Receives workflow run events |
| **Settings** | Set | Channel and repo allow-list |
| **Prepare Alert** | Code | Keeps only completed runs that failed or timed out, and writes the message |
| **Send Alert?** | IF | Successful and in-progress runs stop here |
| **Post to Slack** | HTTP Request | Posts with Slack's `chat.postMessage` (3 retries) |

## If something goes wrong

| Symptom | What to check |
|---|---|
| No alert for a failing run | The webhook event must be **Workflow runs**, not Pushes. Check **Recent deliveries** in GitHub. |
| `not_in_channel` | Invite the bot to the channel. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
