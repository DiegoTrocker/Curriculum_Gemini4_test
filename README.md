# Diego Trocker — Engineering Curriculum & 3D Lab

An interactive developer portfolio and engineering curriculum built with React, Vite, Express, Three.js, and Gemini. It includes a live GitHub project showcase, interactive 3D labs, local Markdown content, self-hosted utilities, and an authenticated admin console.

## Features

- Editorial curriculum and technical blog/documentation pages
- Live GitHub profile and repository synchronization through the server API
- Interactive Three.js project lab and browser-based utilities
- Gemini-powered portfolio chat
- Local JSON/Markdown publishing through `/admin`
- Server-rendered SEO metadata for portfolio and content routes

## Requirements

- Node.js 20+ (or Bun)
- A Gemini API key for AI chat and image features

## Getting started

```bash
git clone <repository-url>
cd <repository-directory>
npm install
cp .env.example .env
npm run dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

Configure these values in `.env`:

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | API key used by Gemini-powered features |
| `APP_URL` | Public app URL used for canonical links and SEO |
| `GITHUB_USERNAME` | Optional GitHub account override |
| `GITHUB_TOKEN` | Optional server-side token for higher GitHub API limits |
| `ADMIN_PASSCODE` | Optional passcode for the `/admin` console |
| `LOCAL_ADMIN_ONLY` | Set to `true` to restrict admin writes to localhost |

Never commit `.env` or other secrets.

## Scripts

```bash
npm run dev      # Start the Express/Vite development server
npm run build    # Build the frontend for production
npm run start    # Start the production server
npm run lint     # Run the TypeScript checker
npm run preview  # Preview the Vite build
```

Portfolio content is stored in `data/portfolio.json`. The server creates `data/admin-auth.json` when a passcode is configured through the admin flow; keep this file private.
