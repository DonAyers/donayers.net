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

if (process.env.ANTHROPIC_API_KEY) {
  // Anthropic path — used when ANTHROPIC_API_KEY secret is set
  console.log("Provider: anthropic");
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
  // GitHub Models path — default, uses COPILOT_CLI_PAT or GITHUB_TOKEN
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (!token) {
    console.error("No token available. Set GITHUB_MODELS_TOKEN or ANTHROPIC_API_KEY.");
    process.exit(1);
  }

  console.log("Provider: github-models (openai/gpt-4.1)");
  console.log(`Theme: ${theme}`);

  const response = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    body: JSON.stringify({
      model: "openai/gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`GitHub Models API error ${response.status}: ${error}`);
    process.exit(1);
  }

  const data = await response.json();
  content = data.choices[0].message.content.trim();
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
