# AI Text Classifier API

> A secured POST endpoint that returns topic, sentiment, confidence and a one-line summary.

|  |  |
|---|---|
| **Starts when** | Webhook, `POST /webhook/classify-content` (the caller waits for the answer) |
| **You need** | OpenAI Account, Classifier API Key |
| **Cost** | One OpenAI request per call |
| **Workflow file** | `text-classifier-api.json` |

## Credentials

| Name in the workflow | n8n credential type | How to create it |
|---|---|---|
| **OpenAI Account** | OpenAI API | Create a key at platform.openai.com/api-keys and paste it into a new **OpenAI API** credential. |
| **Classifier API Key** | Header Auth | New **Header Auth** credential: name `X-API-Key`, value any long random string. Callers must send the same header. |

Credentials are referenced by name only. After importing, open each node that shows a credential warning and select yours.

## Set up

1. Create the **Classifier API Key** credential (Header Auth, name `X-API-Key`, any long random value) and the **OpenAI API** credential.
2. Import `text-classifier-api.json`, assign both credentials (**Webhook** and **Classify with OpenAI**).
3. Activate the workflow and copy the **Production URL** from the **Webhook** node.
4. Call it with the curl command below.

## Settings you can change

They all live in the **Settings** node (open it and edit the values).

| Setting | Default | What it does |
|---|---|---|
| `openaiModel` | `gpt-4o-mini` | Chat model used for classification. |
| `maxChars` | `20000` | Longer texts are rejected with HTTP 400. |

## Try it

```bash
curl -X POST https://<your-n8n>/webhook/classify-content \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your key>" \
  -d '{"text": "NASA successfully launched the Artemis mission to the Moon today."}'
```

## What you get

```json
{
  "success": true,
  "data": {
    "classification": {
      "topic": "science",
      "sentiment": "positive",
      "confidence": 0.97,
      "summary": "NASA launched the Artemis mission to the Moon."
    },
    "inputText": "NASA successfully launched the Artemis mission to the Moon today.",
    "processedAt": "2026-10-14T09:12:44.000Z"
  }
}
```
Topics: technology, science, business, politics, sports, entertainment, health, education, lifestyle, other.
Sentiments: positive, neutral, negative, mixed.

## Built-in safeguards

The endpoint needs an API key, so strangers cannot spend your OpenAI credit. The reply is always valid JSON, because anything the model returns outside the allowed values is corrected.

## Nodes

| Node | Type | What it does |
|---|---|---|
| **Webhook** | Webhook | POST endpoint protected by the `X-API-Key` header |
| **Settings** | Set | Model and size limit |
| **Validate Input** | Code | Checks that `text` is a non-empty string within the limit, builds the AI request |
| **Valid Input?** | IF | Routes bad input to a 400 response |
| **Classify with OpenAI** | HTTP Request | Requests a JSON answer (3 retries; failures go to the error output) |
| **Parse Classification** | Code | Accepts only known topics and sentiments, clamps confidence to 0 to 1 |
| **Respond Success** | Respond to Webhook | HTTP 200 with the result |
| **Respond Bad Request** | Respond to Webhook | HTTP 400 with a clear error |
| **Respond Upstream Error** | Respond to Webhook | HTTP 502 when OpenAI is unavailable |

## If something goes wrong

| Symptom | What to check |
|---|---|
| 403 Forbidden | The `X-API-Key` header is missing or does not match the credential. |
| 400 Bad Request | Send JSON with a `text` string, and set `Content-Type: application/json`. |
| 502 from the endpoint | OpenAI did not answer after retries. Check the key, credit and model name. |

More help: [docs/troubleshooting.md](../../docs/troubleshooting.md)
