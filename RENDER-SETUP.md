# Render deployment

1. Use this repository as a Node Web Service, Free plan, build npm ci --omit=dev --ignore-scripts --no-audit --no-fund, start npm start.
2. Set DATABASE_URL to your private Neon connection string. Do not commit it or paste it into chat. Deployment refuses to start without it on Render.
3. Deploy the latest commit and open /healthz. Confirm nativeCoop:true, storage:"postgres", current gameVersion and no updateError.
4. Refresh the game in every browser. Use native Co-op to create or join a four-character room. Maximum eight.
5. Verify a pull/collection, restart the service and confirm the same browser/account retains the balance. Lobby codes reset on a server restart.

The game checks the current official build at startup and refuses unsupported modifications. It uses native co-op and teammate HUD, with an authenticated relay fallback for unavailable direct connections. Render Free wake-up delay/usage limits still apply.
