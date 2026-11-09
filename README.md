# Battlegroud

Free, no-backend "who would win" web app.

- **Verdict:** Google Gemini 3.5 Flash (free tier)
- **Character art:** Pollinations.ai (no API key required)
- **Storage:** localStorage (BattleDex)
- **Hosting:** Vercel serverless function

## Setup

1. Get a free Gemini API key: https://aistudio.google.com/app/apikey
2. Push this folder to a GitHub repo (or upload to Vercel directly).
3. Import the project in Vercel.
4. Add an Environment Variable:
   - Name: `GEMINI_API_KEY`
   - Value: your Gemini key
5. Deploy.

## Rate limiting

The serverless function (`api/battle.js`) enforces **5 battles per minute per IP** to prevent spam-clicking and protect your free Gemini quota. The limit resets when the function cold-starts, which is fine for a hobby project.

## File structure

```
index.html        # UI
style.css         # Styling
app.js            # Frontend logic + localStorage BattleDex
api/battle.js     # Vercel function: proxies Gemini + rate limit
vercel.json       # Vercel config
README.md         # This file
```

## Notes

- Images come from Pollinations via a plain `` URL, so no image API key is needed.
- If you want stricter rate limiting that survives cold starts, swap the in-memory `Map` for Upstash Redis / Vercel KV later.