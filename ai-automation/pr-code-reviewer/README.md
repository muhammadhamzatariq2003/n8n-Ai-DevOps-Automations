# AI PR Code Reviewer

> Every new pull request gets a first review comment before a human opens it.

|  |  |
|---|---|
| **Starts when** | Webhook, `POST /webhook/github-pr-review`, registered as a GitHub **Pull requests** webhook |
| **You need** | GitHub Token, OpenAI Account |
| **Cost** | One OpenAI request per reviewed PR (default model: gpt-4o) |
| **Workflow file** | `pr-code-reviewer.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **GitHub Token** | Header Auth | New **Header Auth** credential: name `Authorization`, value `Bearer <your token>`. Use a fine-grained token limited to the repos you need. |
| **OpenAI Account** | OpenAI API | Create a key at platform.openai.com/api-keys and paste it into a new **OpenAI API** credential. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create a fine-grained GitHub token for your repo with **Pull requests: Read and write** and **Issues: Read and write**. Add it as the **GitHub Token** credential (Header Auth, `Authorization: Bearer <token>`).
2. Create the **OpenAI API** credential.
3. Import `pr-code-reviewer.json`, assign credentials to **Fetch PR Diff**, **Review with OpenAI** and **Post Review Comment**.
4. Activate the workflow. Copy the **Production URL** of **GitHub PR Webhook**.
5. In GitHub: repo **Settings, Webhooks, Add webhook**. Payload URL = the copied URL, content type `application/json`, event **Pull requests** only.
6. Open a test PR (a draft PR is skipped until it is marked ready).

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `openaiModel` | `gpt-4o` | Model used for reviews. |
| `maxDiffChars` | `12000` | Longer diffs are cut, and the comment says so. |
| `allowedRepos` | empty | Comma-separated `owner/repo` list. Empty means any repository that sends events. |

## What you get

```
## AI Code Review

## Summary
Adds a login endpoint with token refresh.

## Issues Found
- auth/login.js, line 42: the SQL query is built with string concatenation (injection risk).

## Suggestions
- Move input validation into its own function.

## Verdict
REQUEST_CHANGES

---
Automated review (n8n + OpenAI). Verify suggestions before applying them.
```

## Built-in safeguards

The diff and PR text are marked as untrusted in the prompt, so instructions hidden in code comments are ignored. Use `allowedRepos` so other repositories cannot trigger paid reviews.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **GitHub PR Webhook** | Webhook | Receives pull request events |
| **Settings** | Set | Model, diff limit and repo allow-list |
| **Review This PR?** | IF | Only `opened`, `reopened` and `ready_for_review`, never drafts, only allowed repos |
| **Fetch PR Diff** | HTTP Request | Downloads the diff through GitHub's API (works for private repos) |
| **Prepare Review** | Code | Trims the diff and builds the review prompt |
| **Review with OpenAI** | HTTP Request | Creates the review (3 retries) |
| **Build Comment** | Code | Wraps the review in a comment, adds a note if the diff was cut |
| **Post Review Comment** | HTTP Request | Posts the comment on the PR |

## If something goes wrong

| Symptom | What to check |
|---|---|
| Nothing happens on a new PR | In GitHub open **Settings, Webhooks, Recent deliveries** to see the response, and use **Redeliver** to replay an event while testing. |
| 401 or 404 from GitHub | The token lacks access to the repo or the permissions listed above. |
| Review is cut short | Raise `maxDiffChars`, or review large PRs per folder. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
