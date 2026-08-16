# CRISPY LIMEY ENGINE 🍋‍🟩

Dependency-free HTML/CSS/JS homework control center.

## Current bundled checkpoint
- Aug 15, 2026
- Campaign remaining: 157
- RACE: NT5.21–NT5.30 = 10
- CRISP: A5.24–A5.30 + A6 + A9 + G9 = 67
- FUTURE: NT6–NT9 = 80
- Audit baseline: 190 remaining after A4 closed on Aug 11; only Aug 12 onward reduces that checkpoint.

## Features
- exact 20-square chapter bars
- RACE / CRISP / FUTURE classification
- campaign remaining + reconciliation audit
- raw average, safe target, future average
- tomorrow-proof threshold
- buffer + zero-day count
- RACE deadline pressure
- assignment shocks that move FUTURE → RACE without changing campaign total
- iPad condition
- multipart notes without double-counting
- unresolved vs permanent skips
- undo last event
- actual average trajectory chart
- localStorage
- JSON import/export

## Open it
Because `app.js` fetches `initial_state.json`, serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/crispy_limey_engine/
```

You can also deploy the folder to GitHub Pages or any static host.
