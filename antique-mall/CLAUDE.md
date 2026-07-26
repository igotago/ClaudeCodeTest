# antique-mall

Unlike the rest of this repo, this is a small Node/SQLite app hosted under IIS, not a static HTML file.

## Running

### Local dev (without IIS)

From the repo root:

```
npm start
```

Serves on `http://localhost:4000`. Open `mall-owner.html`, `pos.html`, or `vendor.html` through that server (e.g. `http://localhost:4000/pos.html`) — do not open the `.html` files directly via `file://`, since they now call a JSON API instead of using `localStorage`.

### IIS hosting

The app is designed to run under IIS via [iisnode](https://github.com/Azure/iisnode):

1. Install IIS with the URL Rewrite module, plus iisnode.
2. Point an IIS site (or virtual application) at the `antique-mall/` folder.
3. `web.config` in this folder wires iisnode to `server/app.js` and rewrites all requests to it — IIS never serves the `.html`/`.js` files directly, `server/app.js` does, the same as in local dev.
4. iisnode passes the app a named-pipe address via `process.env.PORT`; `server/app.js` passes that straight to `http.createServer(...).listen(...)`, so no code changes are needed between local dev and IIS.

### Hostinger hosting

`antique-mall/` has its own `package.json` (separate from the repo root's) so the folder can be deployed on its own — Hostinger's Node.js app runner (hPanel, Passenger-based) expects an app root containing a `package.json`.

1. Upload the contents of `antique-mall/` to the app's folder on Hostinger (via Git, File Manager, or FTP). The gitignored `server/antique-mall.db*` files should NOT be uploaded — the app creates a fresh database on first run.
2. In hPanel → **Websites → \[your site] → Advanced → Node.js**, create/edit the application:
   - **Application root**: the folder you uploaded to (e.g. `antique-mall`)
   - **Application URL**: the domain/subdomain to serve it on
   - **Application startup file**: `server/app.js`
   - **Node.js version**: 22.5 or newer — `server/db.js` uses the built-in `node:sqlite` module, which needs it
3. Click **Run NPM Install** (there are no external dependencies, but this creates `node_modules` and confirms the Node version).
4. Start/restart the application from hPanel. Passenger sets `process.env.PORT` (or a Unix socket) for you and proxies the domain to it — same mechanism as iisnode, so `server/app.js` needs no changes.
5. The SQLite database file (`server/antique-mall.db`) is created on disk inside the app folder on first request — make sure that folder is writable (it is, by default, under Hostinger's Node.js apps).

## Architecture

- `data.js` — client-side API wrapper. Every function (`getVendors`, `addVendor`, `checkout`, etc.) is `async` and returns a Promise backed by `fetch()`. Callers must `await` them.
- `server/db.js` — opens the SQLite connection (`server/antique-mall.db`, gitignored) and creates the schema on startup.
- `server/routes.js` — plain functions implementing the API (vendors, inventory, settings, sales), dispatched by `handleApiRequest(method, pathname, query, body)`. No web framework — this is deliberate, since IIS is the actual web server and Node only needs to answer the requests iisnode forwards to it.
- `server/app.js` — a plain `node:http` server: serves the 4 static files, forwards `/api/*` to `handleApiRequest`, and listens on `PORT` (default `4000` locally; a named pipe under iisnode).
- `web.config` — IIS + iisnode configuration; routes all requests to `server/app.js`.

`POST /api/sales` is the checkout endpoint: it validates stock for every cart line and decrements it in a single database transaction, so a sale either fully commits or fully fails (no partial checkouts). It also records a `sales` + `sale_line_items` row per sale — there is no UI for browsing sales history yet, but the data is captured.

## Known limitations (v1)

- No live sync across tabs/devices — pages refetch only on load and after their own mutations.
- No import from old `localStorage` data — the SQLite database starts empty.
