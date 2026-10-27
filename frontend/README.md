# Kairox frontend

The Kairox frontend is a React application built with Vite. It provides
authentication, thought submission, per-input task dependency graphs, task
details and editing, and a timeline view.

## Development

From this directory:

```bash
npm ci
npm run dev
```

By default, the frontend sends API requests to
`http://localhost:8000/api/v1`. Override the API base URL by setting
`VITE_API_BASE_URL`, including the `/api/v1` prefix.

## Checks

```bash
npm run lint
npm run build
```

See the repository [README](../README.md) for backend services and full-stack
setup.
