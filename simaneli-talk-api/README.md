# Simaneli Talk API

Standalone Cloudflare Worker source code for speech-to-text.
No changes to the Simaneli shop or `talk/index.html` are required.

## Setup with Cloudflare Dashboard

This folder is meant to be deployed as a **Worker**, with project root `simaneli-talk-api`.
Select GitHub repository `Simaneli/Simaneli`, root directory `simaneli-talk-api` if the Git integration offers that option. Match the existing Worker name `simaneli-talk-api` only if Cloudflare permits connecting it; do not overwrite the existing deployment without reviewing its settings.

Worker code: `worker.js`. Wrangler settings: `wrangler.toml`.

The production Worker must have an encrypted secret named `GROQ_API_KEY`. Never commit its value.

Test: GET / returns `{"app":"Simaneli Talk","status":"online"}`.
POST /transcribe expects multipart form with `file` (<=5 MB) and `language` ("hy" or "zh"). Returns JSON with `text`.

**Before public launch:** add server-enforced rate limits / bot controls. Checking the Origin header and configuring CORS are *not* authorization and do not stop scripted abuse. An exposed public endpoint can use up the Groq free allowance. Speech recognition accuracy for Armenian is unverified. No speech translation or text-to-speech service is included yet. The frontend is not yet wired up to this API.

## Deployment

Cloudflare Builds linked to main. Deployment command: `npx wrangler deploy --config simaneli-talk-api/wrangler.toml`.
