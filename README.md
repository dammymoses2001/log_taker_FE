# Log viewer (frontend)

Standalone Vite + React app for the Logviewer dashboard and PIN-gated log viewer.

## Develop

```bash
npm install
npm run dev
```

The dev server runs on port 5173 and proxies `/v1` to the API at `http://127.0.0.1:8787`. Start the backend API first.

```bash
npm test
npm run build
```

## Production

In production this app is served by the backend (`apps/api`) from `apps/web/dist` on the same origin, so SameSite cookies work. You do not need `VITE_API_BASE_URL` in that setup.
