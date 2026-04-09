---
title: smolagents Godmode
emoji: 🤖
colorFrom: green
colorTo: blue
sdk: gradio
pinned: false
---

# smolagents Godmode

This directory is the canonical local source for the GODMODE smolagents layer.

## Implemented capabilities

- web research via DuckDuckGo and page visits
- code execution via Python interpreter tools
- screenshot-based visual debugging through `VisualDebugTool`
- manager orchestration across research and code-writing agents

## Runtime expectations

- `HF_TOKEN` for hosted model access
- `OPENROUTER_API_KEY` for OpenRouter-compatible inference
- `ANTHROPIC_API_KEY` for screenshot inspection
- local core install via `requirements.txt` covers the current app code path
- browser-heavy extras such as `playwright` or `browser-use` are optional and
  should only be installed when this module is extended to use them directly

## Canonical role in the stack

- `SUPERPOWER 3`: web-crawler / research path
- `SUPERPOWER 9`: vision-assisted visual inspection
- optional research and review branch for LangGraph and the pilot loop
