# Budgetly

A pay-attention-to-your-money app for iPhone: income, expenses, monthly and category budgets, savings goals, recurring bills and insights. Installable from Safari, works offline. Data stays on the phone (localStorage) — use Settings → Copy backup now and then.

## Files
- `index.html` — the whole app (HTML, CSS, JS)
- `manifest.webmanifest`, `icons/` — home-screen name and icon
- `sw.js` — offline cache. Bump `CACHE` (e.g. `budgetly-v2`) whenever you push an update.

## Deploy
Push to a GitHub repo → Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
Then open `https://<user>.github.io/budgetly/` in Safari → Share → Add to Home Screen.
