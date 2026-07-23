# antique-mall

Unlike the rest of this repo, this is a small Node/Express/SQLite app, not a static HTML file.

## Running

From the repo root:

```
npm install
npm start
```

Serves on `http://localhost:4000`. Open `mall-owner.html`, `pos.html`, or `vendor.html` through that server (e.g. `http://localhost:4000/pos.html`) — do not open the `.html` files directly via `file://`, since they now call a JSON API instead of using `localStorage`.

## Architecture

- `data.js` — client-side API wrapper. Every function (`getVendors`, `addVendor`, `checkout`, etc.) is now `async` and returns a Promise backed by `fetch()`. Callers must `await` them.
- `server/db.js` — opens the SQLite connection (`server/antique-mall.db`, gitignored) and creates the schema on startup.
- `server/routes.js` — REST API mounted at `/api` (vendors, inventory, settings, sales).
- `server/app.js` — Express app: serves the 4 static files plus the `/api` routes, listens on `PORT` (default `4000`).

`POST /api/sales` is the checkout endpoint: it validates stock for every cart line and decrements it in a single database transaction, so a sale either fully commits or fully fails (no partial checkouts). It also records a `sales` + `sale_line_items` row per sale — there is no UI for browsing sales history yet, but the data is captured.

## Known limitations (v1)

- No live sync across tabs/devices — pages refetch only on load and after their own mutations.
- No import from old `localStorage` data — the SQLite database starts empty.
