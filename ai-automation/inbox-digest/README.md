# AI Inbox Digest

> Long emails in, three bullet points out.

|  |  |
|---|---|
| **Starts when** | Gmail Trigger, polls your inbox every minute (Promotions, Social and mail from yourself are filtered out) |
| **You need** | Gmail Account, OpenAI Account |
| **Cost** | One OpenAI request per email that passes the filters |
| **Workflow file** | `inbox-digest.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **Gmail Account** | Gmail OAuth2 API | Create an OAuth client in Google Cloud Console (Gmail API enabled) and connect it in a new **Gmail OAuth2** credential. |
| **OpenAI Account** | OpenAI API | Create a key at platform.openai.com/api-keys and paste it into a new **OpenAI API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Import `inbox-digest.json` (see the root README) and create the two credentials below.
2. Open **Gmail Trigger**, **Send Digest** and **Summarize with OpenAI** and pick your credentials.
3. Open **Settings** and decide where digests go (`deliverTo`).
4. Click **Execute workflow**, send yourself a long test email, and check the run.
5. Toggle the workflow to **Active**.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `deliverTo` | `me` | `me` sends the digest to the address the email was delivered to (your mailbox). Or enter a fixed address. |
| `replyToSender` | `false` | Set `true` to send the digest back to the original sender. This emails outside people, so use it with care. |
| `minChars` | `400` | Emails shorter than this are not summarized. |
| `openaiModel` | `gpt-4o-mini` | Any chat model your OpenAI account can use. |

## What you get

```
Subject: AI Summary: Quarterly plan
- Finance needs your sign-off on the budget by Friday.
- Two roles are approved for Q1 hiring; job posts go live Monday.
- Next review meeting is moved to the 14th.

---
Original sender: boss@corp.com
```

## Built-in safeguards

No-reply and bounce senders, its own digests and very short emails are skipped, so it cannot loop. The email text is treated as untrusted: the prompt tells the model not to follow instructions inside it.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **Gmail Trigger** | Gmail Trigger | Polls the inbox every minute |
| **Settings** | Set | Holds the options above |
| **Prepare Email** | Code | Reads sender, subject and body, skips automated or short mail, trims to 12,000 characters, builds the AI request |
| **Worth Summarizing?** | IF | Stops here for skipped emails |
| **Summarize with OpenAI** | HTTP Request | Calls the OpenAI Chat Completions API (3 retries) |
| **Build Digest** | Code | Creates the subject `AI Summary: ...` and the message body |
| **Send Digest** | Gmail | Sends the digest |

## If something goes wrong

| Symptom | What to check |
|---|---|
| Nothing is sent | Open **Prepare Email** and look at its input. The email may be shorter than `minChars`, or from a no-reply address. |
| Body is empty | Gmail field names vary slightly between n8n versions. The first lines of **Prepare Email** read `Subject`, `From`, `To`, `text`, `html` and `snippet`; adjust them to match what **Gmail Trigger** outputs for you. |
| OpenAI 401 or 429 | 401 means a wrong key. 429 means your OpenAI account is out of credit or rate-limited. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
