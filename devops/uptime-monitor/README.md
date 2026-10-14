# Uptime Monitor with Slack Alerts

> Pings your URLs every 5 minutes and tells Slack when something breaks and when it recovers.

|  |  |
|---|---|
| **Starts when** | Schedule Trigger, every 5 minutes (no webhook needed) |
| **You need** | Slack Account |
| **Cost** | No AI calls, free to run |
| **Workflow file** | `uptime-monitor.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **Slack Account** | Slack API | In your Slack app (api.slack.com/apps) copy the **Bot User OAuth Token** (`xoxb-...`) into a new **Slack API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a Slack app with the bot scope `chat:write`, install it, and invite the bot to your alerts channel.
2. Create the **Slack API** credential in n8n and assign it to **Post to Slack**.
3. Open **Define Targets** and replace the example entries with your own `name`, `url` and optional `expectedStatus`.
4. Open **Settings** and set `slackChannel`.
5. Activate the workflow. It starts on the next 5-minute mark.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `slackChannel` | `engineering-alerts` | Channel name (without `#`) or channel ID. |
| `failuresBeforeAlert` | `2` | Consecutive failed checks before the first alert (avoids false alarms from one slow response). |
| `repeatAlertEvery` | `12` | While a service stays down, repeat the alert every this many checks (12 checks = 1 hour). |

## What you get

```
🚨 Server health alert
Service: Main API
URL: https://api.example.com/health
Problem: HTTP 503 (expected 200)
Tue, 14 Oct 2026 09:35:00 GMT

✅ Recovered
Service: Main API
URL: https://api.example.com/health
It was failing for 4 checks.
```

## Built-in safeguards

You get one alert when a service goes down, a reminder every hour while it stays down, and one message when it recovers, instead of a message every 5 minutes.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **Schedule Trigger** | Schedule Trigger | Runs every 5 minutes |
| **Settings** | Set | Channel and alert thresholds |
| **Define Targets** | Code | The list of services to watch, one item each |
| **Check Each URL** | HTTP Request | GET with a 10-second timeout; errors and timeouts continue instead of stopping the run |
| **Detect Changes** | Code | Counts failures per URL (kept between runs) and decides what is worth a message |
| **Post to Slack** | HTTP Request | Posts the alerts (3 retries) |

## If something goes wrong

| Symptom | What to check |
|---|---|
| No alerts during manual tests | Failure counts are only remembered while the workflow is active, so test by activating it with a URL that returns an error. |
| A site redirects | Redirects are followed. If you expect a redirect status itself, set `expectedStatus` for that target. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
