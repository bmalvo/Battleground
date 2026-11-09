# Battlegroud - Project Brief

## 1. What are we building? (Scope)

A web app where you type in two fighters and get an AI-generated verdict on who would win, plus AI-generated character art for both.

## 2. MVP (smallest shippable version)

- Two text inputs + a FIGHT button
- A working verdict (AI-generated text) + character art for both fighters
- Loading state while waiting on the API
- BattleDex saved to localStorage (save a battle, view saved battles, refight from saved list)
- Type two fighters, get a real result. Save it if you want.

## 3. Tech stack

- **Frontend:** HTML, CSS, Vanilla JS
- **Hosting:** Vercel (serverless function)
- **Verdict AI:** Google Gemini 1.5 Flash (free tier via Google AI Studio) — proxied through `/api/battle` so the API key never reaches the browser
- **Character art:** Pollinations.ai (free, no API key required — generates images via URL)
- **BattleDex:** localStorage (saved in the browser)
- **Rate limiting:** 5 battles per minute per IP, enforced in the Vercel serverless function (in-memory). Returns HTTP 429 with `Retry-After` header when exceeded.

## 4. Long-term vision (post-MVP)

- Real backend so BattleDex characters sync across devices (instead of localStorage only)
- Quick re-fight option using characters already saved in the BattleDex (basic version included in MVP via localStorage)

## 5. File structure

```
battlegroud/
├── index.html           # UI: inputs, FIGHT button, loader, result, BattleDex
├── style.css            # Responsive dark-theme styling
├── app.js               # Frontend logic, Pollinations image URLs, localStorage BattleDex
├── api/
│   └── battle.js        # Vercel serverless function: calls Gemini, enforces rate limit
├── vercel.json          # Vercel function config
├── project-brief.md     # This file
└── README.md            # Deploy instructions
```

## 6. Setup steps

1. Get a free Gemini API key: https://aistudio.google.com/app/apikey
2. Push the `battlegroud/` folder to a GitHub repo (or upload to Vercel directly)
3. Import the project in Vercel
4. Add Environment Variable:
   - Name: `GEMINI_API_KEY`
   - Value: your Gemini key
5. Deploy

## 7. Notes / constraints

- **100% free stack:** Gemini free tier + Pollinations (no key) + Vercel hobby tier + localStorage
- Images come from Pollinations via a plain image URL — no image API key needed
- Rate limit resets when the serverless function cold-starts (acceptable for a hobby project). For stricter/persistent limits later, swap the in-memory `Map` for Upstash Redis / Vercel KV.