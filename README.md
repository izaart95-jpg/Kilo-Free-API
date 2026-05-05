# Kilo-Free-API

> **Access powerful LLMs for free — no sign-up, no API key, no auth token. Just raw HTTP.**

Kilo Code exposes an OpenRouter-compatible (and Anthropic-compatible) REST API that lets you query free-tier LLMs directly, with zero authentication. This repo documents the endpoints and provides a Node.js interactive CLI chat.

---

## GitHub Description

> Free LLM API access via Kilo Code — no auth, no cost. Includes Node.js CLI chat. OpenAI & Anthropic compatible.

---

## Table of Contents

- [Base URL](#base-url)
- [List Free Models](#list-free-models)
- [Chat Completions — OpenAI-compatible](#chat-completions--openai-compatible)
- [Messages — Anthropic-compatible](#messages--anthropic-compatible)
- [Use with SDKs](#use-with-sdks)
- [Interactive CLI Chat (`chat.mjs`)](#interactive-cli-chat-chatmjs)
- [Notes](#notes)

---

## Base URL

```
https://api.kilo.ai/api/openrouter/
```

No `Authorization` header required.

---

## List Free Models

```bash
curl -X GET "https://api.kilo.ai/api/openrouter/models" | jq '.data[] | select(.id | contains(":free")) | .id'
```

Or just use the auto-routing alias `kilo-auto/free` which picks the best available free model automatically.

---

## Chat Completions — OpenAI-compatible

**Streaming**

```bash
curl -X POST https://api.kilo.ai/api/openrouter/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kilo-auto/free",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 1024,
    "stream": true
  }'
```

**Non-streaming**

```bash
curl -X POST https://api.kilo.ai/api/openrouter/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kilo-auto/free",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 1024,
    "stream": false
  }'
```

---

## Messages — Anthropic-compatible

```bash
curl -X POST https://api.kilo.ai/api/openrouter/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kilo-auto/free",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 1024,
    "stream": false
  }'
```

---

## Use with SDKs

### OpenAI SDK (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.kilo.ai/api/openrouter/",
    api_key="no-key-needed"
)

response = client.chat.completions.create(
    model="kilo-auto/free",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### OpenAI SDK (Node.js)

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.kilo.ai/api/openrouter/",
  apiKey: "no-key-needed",
});

const res = await client.chat.completions.create({
  model: "kilo-auto/free",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(res.choices[0].message.content);
```

### Anthropic SDK (Python)

```python
import anthropic

client = anthropic.Anthropic(
    base_url="https://api.kilo.ai/api/openrouter/",
    api_key="no-key-needed"
)

message = client.messages.create(
    model="kilo-auto/free",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
print(message.content[0].text)
```

---

## Interactive CLI Chat (`chat.mjs`)

A zero-dependency Node.js terminal chat client. No `npm install` needed — uses only built-in Node APIs and native `fetch`.

**Requirements:** Node.js 18+

**Run:**

```bash
node chat.mjs
```

**What it does:**

1. Fetches all available `:free` models from the API on startup
2. Displays a paginated, searchable model list — pick by number or type a partial name
3. Asks whether to enable streaming (token-by-token) or wait for full response
4. Opens a persistent multi-turn chat session with full conversation history

**In-chat commands:**

| Command   | Action                          |
|-----------|---------------------------------|
| `/clear`  | Reset conversation history      |
| `/stream` | Toggle streaming on/off         |
| `/exit`   | Quit                            |

```
  ╔═══════════════════════════════╗
  ║     Kilo-Free-API  Chat       ║
  ║  No auth · No cost · No limit ║
  ╚═══════════════════════════════╝

  ✓ Found 47 free models

  Available Free Models

    1  inclusionai/ling-2.6-1t:free
    2  nvidia/nemotron-3-super-120b-a12b:free
    3  poolside/laguna-m.1:free
   ...

  Enter model number or partial name: 2

  ╔ MODEL ╗  nvidia/nemotron-3-super-120b-a12b:free
  Enable streaming? (Y/n): y

  You: what is 8 squared?
  AI: 8 squared (8²) means 8 × 8 = **64**
```

---


## Notes

- **No authentication** — no `Authorization` header needed whatsoever
- **Rate limits** — occasional `429` errors are expected. It's free. Just retry.
- **Cost** — always `0`. The `cost` field in every response will be `0`.
- **Model routing** — `kilo-auto/free` auto-selects the best available free model. Specify a `:free` model ID to pin to a specific one.
- **Compatibility** — fully compatible with any OpenAI SDK by setting `base_url`. Also implements the Anthropic `/messages` endpoint format.

---

## Free Models (sample)

| Model | Notes |
|---|---|
| `kilo-auto/free` | Auto-routes to best available |
| `inclusionai/ling-2.6-1t:free` | Large multilingual model |
| `nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA 120B |
| `poolside/laguna-m.1:free` | Code-focused |
| `x-ai/grok-code-fast-1:optimized:free` | xAI fast coding model |
| `stepfun/step-3.5-flash:free` | StepFun flash |

Run the models endpoint for the full current list — it changes as new free models are added.

---

**Enjoy free inference. Don't abuse it.**
