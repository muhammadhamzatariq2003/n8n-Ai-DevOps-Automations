# GitHub Issue Auto-Labeler

> New issues are read by AI and labeled for you.

|  |  |
|---|---|
| **Starts when** | Webhook, `POST /webhook/github-issue-labeler`, registered as a GitHub **Issues** webhook |
| **You need** | GitHub Token, OpenAI Account |
| **Cost** | One OpenAI request per new issue |
| **Workflow file** | `issue-auto-labeler.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **GitHub Token** | Header Auth | New **Header Auth** credential: name `Authorization`, value `Bearer <your token>`. Use a fine-grained token limited to the repos you need. |
| **OpenAI Account** | OpenAI API | Create a key at platform.openai.com/api-keys and paste it into a new **OpenAI API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a fine-grained GitHub token for your repo with **Issues: Read and write**. Add it as the **GitHub Token** credential (Header Auth, `Authorization: Bearer <token>`).
2. Create the **OpenAI API** credential.
3. Import `issue-auto-labeler.json` and assign credentials to **Suggest Labels with OpenAI** and **Apply Labels**.
4. Optional: edit `allowedLabels` in **Settings** to match your repo.
5. Activate the workflow, copy the **Production URL** of **GitHub Webhook**, and add it in GitHub: **Settings, Webhooks, Add webhook**, content type `application/json`, event **Issues**.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `openaiModel` | `gpt-4o-mini` | Chat model used for triage. |
| `allowedLabels` | bug, enhancement, documentation, question, performance, security, good first issue, help wanted, duplicate, wontfix | The only labels the AI may choose from. GitHub creates a label if it does not exist yet. |
| `addPriorityLabel` | `false` | Set `true` to also add a label like `priority: high`. |
| `allowedRepos` | empty | Comma-separated `owner/repo` list. Empty means any repository that sends events. |

## What you get

```
Issue #42 "App crashes on login when password contains special characters"
AI result:  labels = ["bug", "security"], priority = high
GitHub:     labels `bug` and `security` are added to the issue
```

## Built-in safeguards

The model can only pick from your label list; anything else it invents is dropped. Issue text is treated as untrusted in the prompt.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **GitHub Webhook** | Webhook | Receives issue events |
| **Settings** | Set | Model, label list, options |
| **Triage This Issue?** | IF | Only newly opened issues (not pull requests) from allowed repos |
| **Prepare Triage Prompt** | Code | Builds a prompt that lists the allowed labels |
| **Suggest Labels with OpenAI** | HTTP Request | Returns labels and a priority as JSON (3 retries) |
| **Parse Triage Result** | Code | Keeps only allowed labels, removes duplicates, limits to 3 |
| **Any Labels?** | IF | Skips the API call when nothing fits |
| **Apply Labels** | HTTP Request | Adds the labels through the GitHub API |

## If something goes wrong

| Symptom | What to check |
|---|---|
| Nothing is labeled | Open the **Parse Triage Result** output. If `hasLabels` is false, no allowed label fit the issue. |
| 403 or 404 from GitHub | The token needs **Issues: Read and write** on that repository. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
