import { writeFileSync, readdirSync } from "fs";
import { join } from "path";

const today = new Date();
const dateStr = today.toISOString().split("T")[0];
const blogDir = join("src", "content", "blog");

// Skip if a post already exists for today
const existing = readdirSync(blogDir).find((f) => f.startsWith(dateStr));
if (existing) {
  console.log(`Post already exists for ${dateStr}: ${existing}`);
  process.exit(0);
}

// Rotate through topic themes by day of year for variety
const themes = [
  "a specific thing I learned or noticed while doing frontend work — something concrete, not a tutorial",
  "the overlap between making music and building software — a real comparison, not a forced metaphor",
  "what it's like to build side projects while holding down a demanding day job",
  "a dev tool, workflow change, or habit that has actually changed how I work",
  "something about the Seattle music years — a specific memory, lesson, or observation worth keeping",
  "what building UIs for healthcare has taught me about software correctness and edge cases",
  "a thought on the gap between how developers talk about craft and how they actually work day to day",
];

const dayOfYear = Math.floor(
  (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
);
const theme = themes[dayOfYear % themes.length];

const systemPrompt = `You are writing a post for Don Ayers' personal site (donayers.net). Don is a Seattle-based frontend developer and musician.

Voice: minimal and direct. Short sentences. No filler. No marketing language. No headers inside the post body. No bullet lists. No summary paragraph at the end that restates what was just said. Write in paragraphs.

Background:
- Lead frontend developer at Care Continuity (React/TypeScript, healthcare tech)
- Side projects: Riff, smolbot, pixegen, vscode-battlestation
- Seattle music: Maps on Fire, Black Giraffe, Luminol, Read Underwater — all on Bandcamp
- Writes occasionally when there's something worth saying, not to fill space

Write 200-350 words. Sound like a person, not content. Sound like someone who only posts when they have a real thought.

Output the post in this exact format with no extra text before or after:

---
title: "Title Here"
description: "One sentence, plain."
pubDate: ${today.toISOString()}
---

Post body here.`;

const userPrompt = `Write a post about: ${theme}`;

let content;

if (process.env.COPILOT_GITHUB_TOKEN) {
  // GitHub Copilot path — uses COPILOT_CLI_PAT secret
  console.log("Provider: github-copilot (claude-opus-4-7)");
  console.log(`Theme: ${theme}`);

  // Step 1: Exchange PAT for a short-lived Copilot session token
  const tokenResp = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: {
      "Authorization": `Bearer ${process.env.COPILOT_GITHUB_TOKEN}`,
      "Accept": "application/json",
    },
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    console.error(`Copilot token exchange failed ${tokenResp.status}: ${err}`);
    process.exit(1);
  }

  const { token: sessionToken } = await tokenResp.json();

  // Step 2: Chat completions
  const resp = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sessionToken}`,
      "Copilot-Integration-Id": "vscode-chat",
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error(`Copilot chat API failed ${resp.status}: ${err}`);
    process.exit(1);
  }

  const data = await resp.json();
  content = data.choices[0].message.content.trim();

} else if (process.env.ANTHROPIC_API_KEY) {
  // Anthropic fallback — used when COPILOT_CLI_PAT is not set
  console.log("Provider: anthropic (claude-opus-4-7)");
  console.log(`Theme: ${theme}`);

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  content = message.content[0].text.trim();

} else {
  console.error("No credentials found. Set COPILOT_CLI_PAT or ANTHROPIC_API_KEY as a repo secret.");
  process.exit(1);
}

// Extract title to build filename slug
const titleMatch = content.match(/title:\s*"([^"]+)"/);
if (!titleMatch) {
  console.error("Could not parse title from generated content:");
  console.error(content);
  process.exit(1);
}

const slug = titleMatch[1]
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, "")
  .replace(/\s+/g, "-")
  .replace(/-{2,}/g, "-")
  .replace(/^-|-$/g, "");

const filename = `${dateStr}-${slug}.mdx`;
const filePath = join(blogDir, filename);

writeFileSync(filePath, content + "\n");
console.log(`Generated: ${filePath}`);
