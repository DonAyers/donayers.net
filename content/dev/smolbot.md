---
title: "smolbot"
description: "Procedurally generated 2D side-scrolling platformer used as a testbed for AI agent evaluation — levels generate on the fly, agents play them, results feed back into testing."
tech:
  - TypeScript
  - Canvas API
  - AI Agents
startDate: 2026-01-01T00:00:00.000Z
status: "Experimental"
githubUrl: "https://github.com/DonAyers/smolbot"
featured: false
order: 5
---

## Overview

smolbot is a browser-based 2D platformer where levels are procedurally generated rather than hand-authored. The original motivation was to have a controllable environment for testing AI agent behavior — generate a level, drop an agent in, see what happens, iterate.

It doubles as a playground for experimenting with game feel, procedural generation algorithms, and how much complexity an AI agent can navigate before getting stuck.

### What it does

- Generates side-scrolling platformer levels procedurally at runtime
- Provides a playable game loop for human or agent control
- Designed as a lightweight harness for AI agent evaluation

*Experimental — built for curiosity, not polish.*
