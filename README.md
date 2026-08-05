# BDL — Guess the Share Price

A small web app for the 2026 Shareholders Dinner. Eligible employees log in
with their employee number, submit one guess for the share price ($00.00 –
$999.99), and the closest guess wins $500. Includes a password-protected
admin dashboard for managing the eligible employee list and reviewing
results.

Built with React (Vite) + Netlify Functions + Netlify Blobs for storage —
no external database needed.

---

## 1. Push to GitHub

```bash
cd bdl-shareprice-guess
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/kasey-gaddy/bdl-shareprice-guess.git
git push -u origin main
```

(Swap in whatever repo name/org you actually create on GitHub.)

## 2. Connect to Netlify

In the Netlify dashboard: **Add new site → Import an existing project →
GitHub → select the repo.** Netlify will read `netlify.toml` automatically:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Click **Deploy site**.

## 3. Environment variables (Site settings → Environment variables)

| Variable | Required? | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | Optional | Overrides the default admin password (`K3&GM@rketing`) baked into the code. Recommended once real data is loaded. |
| `NETLIFY_SITE_ID` | Only if Blobs errors appear | Fallback for Netlify Blobs storage auth |
| `NETLIFY_BLOBS_TOKEN` | Only if Blobs errors appear | A Personal Access Token (User settings → Applications → New access token) |

Netlify Blobs is usually auto-configured for deployed functions with no
setup. The code includes a fallback that uses `NETLIFY_SITE_ID` +
`NETLIFY_BLOBS_TOKEN` if the automatic method throws — add those two
variables only if you see storage errors in the function logs.

After adding/changing any environment variable, trigger a redeploy.

## 4. Load your employee list

Once deployed, go to `https://your-site.netlify.app/admin`, log in with the
admin password, and use the **Employees** tab:

- **Mass Import**: paste CSV rows (no header row), one per line:
  ```
  2970,Kasey Gaddy,
  1500,Rob Zedaker,Jane Doe
  ```
  Format is `Employee Number,Name,Guest Name` (guest name optional). You can
  also upload a `.csv` file directly. Duplicate employee numbers — either
  already on the list or repeated within the same paste — are automatically
  skipped and called out by number so you can review them.
- **Add Employees**: for adding one or two people by hand without a CSV.

## 5. Test it

Log in at the root URL (`https://your-site.netlify.app/`) with a real
employee number from your imported list, confirm the not-found and
already-guessed states work as expected, then use the admin **Overview**
tab's stats/distribution to confirm things are recording correctly. If you
want to clear test guesses before the real event, you can wipe them by
calling the admin `resetGuesses` action (there's no button for this in the
UI on purpose, to avoid accidental use — ask if you'd like a button added).

## 6. Day of the dinner

Share the root URL with attendees (QR code on a table tent works well).
Each employee number can only submit once — the server checks this on
submit, not just on login, so it can't be bypassed by refreshing or opening
a new tab.

Use the admin **Overview** tab to watch participation live, and **Export All
Guesses (CSV)** at any point, including after the dinner, to pull the full
list for picking a winner.

## 7. Reusing it next year

The **Overview** tab has a **Wipe for Next Year** panel at the bottom
(outlined in red). It permanently clears both the employee list and every
submitted guess so the same site/repo can be reused for the following
year's dinner without redeploying anything.

To use it: export both CSVs first if you want to keep a copy of this year's
results, then type the exact phrase `WIPE FOR NEXT YEAR` into the field to
unlock the button, and confirm the browser prompt. There's no undo, by
design — it's gated behind the exact-phrase requirement so it can't be
triggered by a stray click. Once wiped, load next year's employee list
through **Mass Import** or **Add Employees** as usual.

---

## How data is stored

Two JSON blobs live in Netlify Blobs, no database setup required:

- `employees` — the eligible list: `{ employeeNumber, name, guestName }`
- `guesses` — submitted guesses: `{ employeeNumber, name, guess, timestamp }`

## Local development

```bash
npm install
npx netlify dev
```

`netlify dev` (from the Netlify CLI) runs both the Vite frontend and the
Netlify Functions locally with working Blobs storage. Running `npm run dev`
alone will serve the frontend but the `/api/*` calls will fail since there's
no function runtime behind them.

## Notes on branding

Colors and layout follow the BDL palette (navy `#152b5a` / `#233e87`, light
blue `#99b2d1`). The BDL brand guide specifies Proxima Nova as the
typeface; since it's a licensed font, this build uses Montserrat as a close
free substitute. If you have Proxima Nova web font files licensed, drop them
into `src/` and swap the `font-family` in `src/styles.css`.
