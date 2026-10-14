# n8n AI & DevOps Automations

Eight ready-to-import [n8n](https://n8n.io) workflows that put AI to work on email, Slack and text, and keep an engineering team informed about GitHub and uptime.

Built by **Hamza Tariq**, AI Automation Expert.

## Pick the one that fixes your day

| I want to... | Workflow | Needs |
|---|---|---|
| stop reading long emails | [Inbox Digest](ai-automation/inbox-digest) | Gmail, OpenAI |
| let my team ask an AI inside Slack | [Slack Ask Bot](ai-automation/slack-ask-bot) | Slack, OpenAI |
| add topic and sentiment detection to an app or script | [Text Classifier API](ai-automation/text-classifier-api) | OpenAI |
| get a first code review on every pull request | [PR Code Reviewer](ai-automation/pr-code-reviewer) | GitHub, OpenAI |
| hear about new and merged PRs in Slack | [PR Slack Alerts](devops/pr-slack-alerts) | Slack |
| get told the moment CI breaks | [CI Failure Alerts](devops/ci-failure-alerts) | Slack |
| label new GitHub issues automatically | [Issue Auto-Labeler](devops/issue-auto-labeler) | GitHub, OpenAI |
| know when a site or API goes down (and when it is back) | [Uptime Monitor](devops/uptime-monitor) | Slack |

## At a glance

```text
AI AUTOMATION
inbox-digest         Gmail inbox ........ filter noise ... AI summary ......... 3 bullets in your inbox
slack-ask-bot        Slack @mention ..... AI answer ....... same thread
text-classifier-api  POST /classify ..... validate ........ AI JSON ........... topic, sentiment, summary
pr-code-reviewer     GitHub PR opened ... fetch diff ...... AI review ......... comment on the PR

DEVOPS
pr-slack-alerts      GitHub PR event .... format ........... Slack message
ci-failure-alerts    GitHub Actions ..... failures only .... Slack message
issue-auto-labeler   GitHub issue ....... AI picks labels .. labels applied
uptime-monitor       every 5 minutes .... ping URLs ........ alert on failure, again on recovery
```

## Run one in about 10 minutes

1. In n8n choose **Workflows, Create workflow**, open the **...** menu and pick **Import from file**. Select the `.json` file inside the workflow's folder.
2. Open the workflow's README and create the credentials it lists (each takes a minute).
3. Open every node that shows a credential warning and pick your credential.
4. Open the **Settings** node and adjust the values (channel, model, limits).
5. Run it once with test data, then switch it to **Active**.

Webhook-based workflows also need the webhook URL registered in GitHub or Slack. Each README shows exactly where.

## Credentials you will create

| Name used in the workflows | n8n type | Permissions to grant |
|---|---|---|
| OpenAI Account | OpenAI API | an API key with credit |
| Slack Account | Slack API | bot token with `chat:write` (the Ask Bot also needs `app_mentions:read`) |
| Gmail Account | Gmail OAuth2 | read and send mail |
| GitHub Token | Header Auth (`Authorization: Bearer <token>`) | fine-grained token: Pull requests and Issues, read and write, only for your repos |
| Classifier API Key | Header Auth (`X-API-Key`) | any long random string you choose |

No key or token is stored in any file here. Workflows only point to credentials by name.

## All settings live in one node

Every workflow starts with a **Settings** node. Change the Slack channel, the AI model, size limits or the repo allow-list there, without touching any code.

## Safeguards built in

- **Untrusted text stays untrusted.** Emails, issues, PR diffs and Slack messages are marked as data in every AI prompt, so instructions hidden inside them are not followed.
- **No loops.** The digest skips its own mail and no-reply senders; the Slack bot ignores other bots.
- **Strict outputs.** The classifier and the labeler ask for JSON and then accept only allowed values, so a surprising answer cannot break the next step.
- **Allow-lists.** GitHub workflows accept an `allowedRepos` list, and the classifier endpoint requires an API key.
- **Retries and error paths.** OpenAI, Slack and GitHub calls retry three times; the classifier answers with a clean 400 or 502 instead of hanging.
- **Quiet by default.** The uptime monitor alerts once, reminds hourly, and announces recovery, instead of posting every 5 minutes.

## Check before you trust

Two scripts ship with the repo and need nothing installed except Python and Node:

```bash
python tools/validate_workflows.py   # structure: ids, connections, credentials, no secrets
node tools/test_code_nodes.js        # logic: runs every Code node and filter on sample data
```

They check the workflow files and the JavaScript with mock data. n8n node settings change between versions, so run each workflow once on your own n8n with test data before relying on it.

## Repository layout

```text
ai-automation/
  inbox-digest/          inbox-digest.json          + README.md
  slack-ask-bot/         slack-ask-bot.json         + README.md
  text-classifier-api/   text-classifier-api.json   + README.md
  pr-code-reviewer/      pr-code-reviewer.json      + README.md
devops/
  pr-slack-alerts/       pr-slack-alerts.json       + README.md
  ci-failure-alerts/     ci-failure-alerts.json     + README.md
  issue-auto-labeler/    issue-auto-labeler.json    + README.md
  uptime-monitor/        uptime-monitor.json        + README.md
docs/troubleshooting.md
tools/validate_workflows.py, tools/test_code_nodes.js
```

## Cost

The five workflows that call OpenAI make one request per email, question, PR or issue (see each README). The three Slack alert workflows make no AI calls.

## License

MIT, see [LICENSE](LICENSE).

---

Built by Hamza Tariq, AI Automation Expert. Available for custom n8n and AI automation work.
