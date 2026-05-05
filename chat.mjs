#!/usr/bin/env node
/**
 * Kilo-Free-API Interactive Chat
 * No auth needed — just run: node chat.mjs
 */

import * as readline from "readline";

const BASE_URL = "https://api.kilo.ai/api/openrouter";
const HEADERS = { "Content-Type": "application/json" };

// ── ANSI colors ──────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
};

const fmt = {
  title: (s) => `${c.bold}${c.cyan}${s}${c.reset}`,
  user: (s) => `${c.bold}${c.green}${s}${c.reset}`,
  ai: (s) => `${c.bold}${c.magenta}${s}${c.reset}`,
  dim: (s) => `${c.dim}${c.gray}${s}${c.reset}`,
  warn: (s) => `${c.yellow}${s}${c.reset}`,
  err: (s) => `${c.bold}${c.red}${s}${c.reset}`,
  num: (s) => `${c.bold}${c.yellow}${s}${c.reset}`,
  badge: (s) => `${c.bgCyan}\x1b[30m ${s} ${c.reset}`,
};

// ── RL helper ────────────────────────────────────────────────────────────────
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

// ── Fetch free models ────────────────────────────────────────────────────────
async function fetchFreeModels() {
  process.stdout.write(fmt.dim("  Fetching free models..."));
  const res = await fetch(`${BASE_URL}/models`, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const free = json.data
    .filter((m) => m.id.includes(":free"))
    .map((m) => m.id)
    .sort();
  process.stdout.write(`\r${fmt.dim("  ✓ Found")} ${fmt.num(free.length)} ${fmt.dim("free models")}\n`);
  return free;
}

// ── Model picker ─────────────────────────────────────────────────────────────
async function pickModel(rl, models) {
  console.log(`\n${fmt.title("  Available Free Models")}\n`);

  const pageSize = 20;
  let page = 0;

  while (true) {
    const start = page * pageSize;
    const slice = models.slice(start, start + pageSize);

    slice.forEach((id, i) => {
      const n = String(start + i + 1).padStart(3, " ");
      console.log(`  ${fmt.num(n)}  ${id}`);
    });

    const hasMore = start + pageSize < models.length;
    if (hasMore) {
      console.log(
        fmt.dim(`\n  Showing ${start + 1}–${start + slice.length} of ${models.length}. Press Enter to see more.`)
      );
    }

    let input = await ask(
      rl,
      `\n${fmt.dim("  Enter model number, partial name to search, or press Enter for more: ")}`
    );
    input = input.trim();

    if (input === "") {
      if (hasMore) {
        page++;
        console.log();
        continue;
      }
      // wrap to auto
      console.log(fmt.dim("  Using kilo-auto/free (auto-routing)\n"));
      return "kilo-auto/free";
    }

    // numeric pick
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= models.length) {
      return models[num - 1];
    }

    // search by partial string
    const matches = models.filter((m) =>
      m.toLowerCase().includes(input.toLowerCase())
    );
    if (matches.length === 1) {
      console.log(fmt.dim(`  → Selected: ${matches[0]}\n`));
      return matches[0];
    }
    if (matches.length > 1) {
      console.log(`\n${fmt.warn("  Multiple matches:")}`);
      matches.forEach((m, i) => console.log(`  ${fmt.num(i + 1)}  ${m}`));
      const pick = await ask(rl, fmt.dim("  Pick a number: "));
      const idx = parseInt(pick.trim(), 10) - 1;
      if (idx >= 0 && idx < matches.length) return matches[idx];
    }

    console.log(fmt.err("  No match. Try again.\n"));
  }
}

// ── Stream chat completion ────────────────────────────────────────────────────
async function streamChat(model, messages) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ model, messages, max_tokens: 2048, stream: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  let fullContent = "";
  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          process.stdout.write(delta);
          fullContent += delta;
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullContent;
}

// ── Non-stream chat completion ────────────────────────────────────────────────
async function fetchChat(model, messages) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ model, messages, max_tokens: 2048, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "(no response)";
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(`
${fmt.title("  ╔═══════════════════════════════╗")}
${fmt.title("  ║     Kilo-Free-API  Chat       ║")}
${fmt.title("  ║  No auth · No cost · No limit ║")}
${fmt.title("  ╚═══════════════════════════════╝")}
`);

  const rl = createRL();

  // fetch models
  let models;
  try {
    models = await fetchFreeModels();
  } catch (e) {
    console.error(fmt.err(`\n  Failed to fetch models: ${e.message}`));
    rl.close();
    process.exit(1);
  }

  // pick model
  const model = await pickModel(rl, models);
  console.log(`\n  ${fmt.badge("MODEL")}  ${fmt.ai(model)}\n`);

  // stream toggle
  const streamInput = await ask(
    rl,
    `  ${fmt.dim("Enable streaming? (Y/n): ")}`
  );
  const streaming = streamInput.trim().toLowerCase() !== "n";
  console.log(
    `  ${fmt.badge(streaming ? "STREAM ON" : "STREAM OFF")}  ${fmt.dim(
      streaming ? "Tokens will print as they arrive." : "Full response printed when complete."
    )}\n`
  );

  console.log(
    fmt.dim(
      `  Type your message and press Enter. Type ${fmt.warn("/exit")}${c.dim}${c.gray} to quit, ${fmt.warn("/clear")}${c.dim}${c.gray} to reset history, ${fmt.warn("/stream")}${c.dim}${c.gray} to toggle streaming.\n`
    )
  );

  const history = [];

  while (true) {
    const input = await ask(rl, `${fmt.user("  You")}${fmt.dim(":")} `);
    const trimmed = input.trim();

    if (!trimmed) continue;

    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log(fmt.dim("\n  Goodbye!\n"));
      rl.close();
      break;
    }

    if (trimmed === "/clear") {
      history.length = 0;
      console.log(fmt.dim("  ✓ History cleared.\n"));
      continue;
    }

    if (trimmed === "/stream") {
      const now = !streaming;
      // reassign via closure trick
      Object.defineProperty(main, "_stream", { value: now, writable: true });
      console.log(
        fmt.dim(`  Streaming is now ${now ? "ON" : "OFF"}.\n`)
      );
      // simplest: just track with a mutable variable
      continue;
    }

    history.push({ role: "user", content: trimmed });

    process.stdout.write(`\n${fmt.ai("  AI")}${fmt.dim(":")} `);

    try {
      let reply;
      if (streaming) {
        reply = await streamChat(model, history);
        process.stdout.write("\n\n");
      } else {
        reply = await fetchChat(model, history);
        process.stdout.write(reply + "\n\n");
      }
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      process.stdout.write("\n");
      console.error(fmt.err(`  Error: ${e.message}\n`));
      // pop the user message if AI failed
      history.pop();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
 });
