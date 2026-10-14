# AI Slack Ask Bot

> @mention the bot, get an answer in the same thread.

|  |  |
|---|---|
| **Starts when** | Slack Trigger on the `app_mention` event (your n8n URL must be reachable from the internet) |
| **You need** | Slack Account, OpenAI Account |
| **Cost** | One OpenAI request per question |
| **Workflow file** | `slack-ask-bot.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **Slack Account** | Slack API | In your Slack app (api.slack.com/apps) copy the **Bot User OAuth Token** (`xoxb-...`) into a new **Slack API** credential. |
| **OpenAI Account** | OpenAI API | Create a key at platform.openai.com/api-keys and paste it into a new **OpenAI API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a Slack app at api.slack.com/apps. Under **OAuth & Permissions** add the bot scopes `app_mentions:read` and `chat:write`, then install it to your workspace.
2. In n8n create the **Slack API** credential with the bot token (add the app's Signing Secret too if the field is offered).
3. Import `slack-ask-bot.json`, assign your credentials to **Slack Trigger**, **Ask OpenAI** and **Reply in Thread**.
4. Open **Slack Trigger**, copy the **Production URL**, and paste it into your Slack app under **Event Subscriptions** (Slack verifies it). Subscribe to the bot event `app_mention`.
5. Invite the bot to a channel (`/invite @YourBot`), activate the workflow, and mention the bot.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `openaiModel` | `gpt-4o-mini` | Chat model used for answers. |
| `systemPrompt` | short Slack-friendly prompt | Change the bot's personality, tone or scope here. |

## What you get

```
You:  @AskBot what is the capital of France?
Bot:  The capital of France is Paris.        (posted in the same thread)
```

## Built-in safeguards

Messages from bots are ignored. Replies always go into the thread of the question, so channels stay tidy.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **Slack Trigger** | Slack Trigger | Receives `app_mention` events |
| **Settings** | Set | Model and system prompt |
| **Prepare Prompt** | Code | Removes the `<@bot>` tag, picks the thread, ignores bot messages, builds the AI request |
| **Should Reply?** | IF | Stops for bot messages (prevents loops) |
| **Needs AI?** | IF | Sends an empty mention to a help message instead of the AI |
| **Ask OpenAI** | HTTP Request | Calls OpenAI (3 retries) |
| **Build Reply** | Code | Chooses the answer or help text, trims to Slack's limit |
| **Reply in Thread** | HTTP Request | Posts with Slack's `chat.postMessage` into the original thread |

## If something goes wrong

| Symptom | What to check |
|---|---|
| Slack says the URL is not verified | The workflow must be active, and you must use the **Production** URL, not the Test URL. |
| `not_in_channel` error | Invite the bot to the channel with `/invite @YourBot`. |
| The bot answers twice | Slack retries events it thinks were missed. Make sure only one copy of this workflow is active. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
