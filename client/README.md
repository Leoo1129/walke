# Walke — Frontend

React 19 + Vite single-page app for the Walke marketplace. See the [root README](../README.md) for full setup, architecture and API documentation.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :3000
npm run build    # production build to dist/, served by the API in production
npm run lint
```

Set `VITE_PROXY_TARGET` to point the dev proxy at a different backend (e.g. `http://localhost:3001` when the API runs in Docker).
