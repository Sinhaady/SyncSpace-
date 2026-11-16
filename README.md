# SyncSpace

SyncSpace is a team collaboration app built with React, Express, MongoDB, and Socket.IO. It provides workspaces and rooms for conversations, with real-time messaging and presence.

## Features

- Workspace and room management with member roles and invitations
- Real-time messages, threads, reactions, and online presence
- Message history with cursor-based pagination
- Local and Google sign-in
- File uploads through Cloudinary, AI discussion summaries through Gemini, and calls through LiveKit

## Run locally

You need Node.js, npm, and a MongoDB connection string. Create `server/.env` with at least:

```dotenv
ATLASDB_URL=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
```

Add credentials for the integrations you intend to use:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Install dependencies and start both apps from the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` requests to the server at `http://localhost:5000`. Check the server with `http://localhost:5000/api/health`.

For a separately hosted client, set `VITE_API_URL` to the API base URL and `VITE_SOCKET_URL` to the Socket.IO server URL in `client/.env`. Set `CLIENT_URL` in `server/.env` to the client's origin.

## Project layout

- `client/` — React and Vite frontend
- `server/` — Express API, MongoDB models, and Socket.IO events

## Available scripts

- `npm run dev` — start client and server together
- `npm run client` — start the Vite client
- `npm run server` — start the server with nodemon
- `npm run build --prefix client` — build the client
- `npm run lint --prefix client` — lint the client
