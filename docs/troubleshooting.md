# Troubleshooting

Problems that come up in more than one workflow.

## Webhooks

| Symptom | Fix |
|---|---|
| GitHub or Slack cannot reach the URL | n8n must be reachable from the internet. On a laptop use a tunnel (for example Cloudflare Tunnel or ngrok) and set n8n's `WEBHOOK_URL` to the public address, then re-copy the URL from the Webhook node. |
| Nothing happens in n8n | Use the **Production URL** and make sure the workflow is **Active**. The **Test URL** only works while you click *Listen for test event*. |
| 404 from the webhook | The path changed after import, or the workflow is inactive. Open the Webhook node and copy the current URL. |
| Want to replay a GitHub event | GitHub: repo **Settings, Webhooks**, your webhook, **Recent deliveries**, **Redeliver**. |

## Making webhooks safer

n8n cannot verify GitHub's signature in these workflows, so:
- change the Webhook node **Path** to a long random string before registering it in GitHub,
- fill in `allowedRepos` in the **Settings** node,
- keep the GitHub token limited to the repos it needs.

## Credentials

| Symptom | Fix |
|---|---|
| "Credential not found" on import | Expected. Open the node and select your own credential of the same type. |
| OpenAI 401 | Wrong or revoked API key. |
| OpenAI 429 | Out of credit or rate limit reached. |
| GitHub 401 | Token expired, or the header value is not `Bearer <token>`. |
| GitHub 403 or 404 | The token has no access to that repository or lacks the permission listed in the workflow's README. |
| Slack `invalid_auth` | Wrong token type. Use the Bot User OAuth Token (`xoxb-...`). |
| Slack `not_in_channel` | Invite the bot: `/invite @YourBot`, or add the `chat:write.public` scope. |
| Slack `channel_not_found` | Use the channel name without `#`, or the channel ID. |

## Slack returns errors but n8n shows success

Slack answers HTTP 200 even for errors and puts the problem in the response body (`"ok": false`). Open the **Post to Slack** node output to read the `error` field.

## Changing the AI model

Edit `openaiModel` in the workflow's **Settings** node. Any chat model your OpenAI account can use works.
