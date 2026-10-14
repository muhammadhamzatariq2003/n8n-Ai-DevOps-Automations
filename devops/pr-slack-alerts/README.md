# GitHub PR Slack Alerts

> Know the moment a pull request is opened or merged, without opening GitHub.

|  |  |
|---|---|
| **Starts when** | Webhook, `POST /webhook/github-pr-alerts`, registered as a GitHub **Pull requests** webhook |
| **You need** | Slack Account |
| **Cost** | No AI calls, free to run |
| **Workflow file** | `pr-slack-alerts.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **Slack Account** | Slack API | In your Slack app (api.slack.com/apps) copy the **Bot User OAuth Token** (`xoxb-...`) into a new **Slack API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a Slack app with the bot scope `chat:write`, install it, and invite the bot to your channel (`/invite @YourBot`). Or add `chat:write.public` to post without inviting.
2. Create the **Slack API** credential in n8n with the bot token.
3. Import `pr-slack-alerts.json`, assign the credential to **Post to Slack**, and set `slackChannel` in **Settings**.
4. Activate the workflow, copy the **Production URL** of **GitHub Webhook**.
5. In GitHub: repo **Settings, Webhooks, Add webhook**, content type `application/json`, event **Pull requests**.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `slackChannel` | `engineering` | Channel name (without `#`) or channel ID. |
| `allowedRepos` | empty | Comma-separated `owner/repo` list. Empty means any repository that sends events. |

## What you get

```
↗ New PR opened
Fix: null pointer in user auth flow        (links to the PR)
By alice in acme/backend
+142 / -38 lines in 3 files

🔀 PR merged
Fix: null pointer in user auth flow
Merged by bob into `main`
Repo: acme/backend
```

## Built-in safeguards

Special characters in PR titles are escaped so they cannot break the Slack message. Closed-without-merge PRs stay silent.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **GitHub Webhook** | Webhook | Receives pull request events |
| **Settings** | Set | Channel and repo allow-list |
| **Prepare Message** | Code | Builds the message for opened, ready-for-review and merged PRs; ignores everything else |
| **Send Alert?** | IF | Stops for events that need no message |
| **Post to Slack** | HTTP Request | Posts with Slack's `chat.postMessage` (3 retries) |

## If something goes wrong

| Symptom | What to check |
|---|---|
| `channel_not_found` | Check the channel name, or use the channel ID, and invite the bot. |
| No message appears | Open GitHub **Recent deliveries** for the webhook and check the response code. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
