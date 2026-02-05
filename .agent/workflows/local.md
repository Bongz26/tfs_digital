---
description: Run the local development environment
---

# Run Local Development Environment

This workflow starts both the server and client for local development.

## Steps

// turbo-all

1. Start the server (backend) in development mode:
   ```
   cd server && npm run dev
   ```
   This will start the Express server with nodemon for hot-reloading.

2. Start the client (frontend) in a separate terminal:
   ```
   cd client && npm start
   ```
   This will start the React development server.

## Expected Behavior

- Server should run on the configured port (check server/.env for PORT, typically 5000)
- Client should run on port 3000 and automatically open in your browser
- Any changes to server files will auto-restart the server
- Any changes to client files will auto-reload the browser

## Troubleshooting

- If you get database connection errors, check that your server/.env file has the correct DATABASE_URL
- If ports are already in use, kill the existing processes
- If dependencies are missing, run `npm run install:all` from the root directory
