# SyncSpace

SyncSpace is a team collaboration app for organizing conversations around workspaces and rooms. The React client connects to an Express API backed by MongoDB, while Socket.IO delivers live chat activity and presence updates. Optional integrations add Google sign-in, file storage, AI summaries, and voice or video calls.

## Features

- **Workspaces and rooms:** Create a space for a team, organize conversations into rooms, invite members, and manage access through member roles.
- **Conversations:** Exchange messages in real time, reply in threads, add reactions, and see who is online. Older messages load through cursor-based pagination, and the API supports message search.
- **Accounts:** Register with an email and password or sign in with Google. Authentication uses a JWT stored in an HTTP-only cookie.
- **Attachments and profiles:** Upload chat files, user avatars, and workspace icons using Cloudinary.
- **Summaries and calls:** Generate summaries of rooms or threads with Gemini, and join voice or video rooms through LiveKit.

## Run locally

You need Node.js, npm, and a MongoDB connection string. Copy the repository, then create `server/.env` with at least:

```dotenv
ATLASDB_URL=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
```

Add credentials for the integrations you intend to use. Google OAuth also needs a callback URL registered with your Google OAuth client. Cloudinary powers uploads, Gemini powers summaries, and LiveKit powers calls.

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

Open `http://localhost:5173` after both processes start. In development, Vite proxies `/api` requests to the Express server at `http://localhost:5000`. You can confirm the API is running by opening `http://localhost:5000/api/health`.

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
