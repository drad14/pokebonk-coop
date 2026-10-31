# Hosting the current native-co-op build

Use [RENDER-SETUP.md](RENDER-SETUP.md) for the current Render + Neon deployment. The old Oracle upload helper was removed during the native rebuild.

The game runs on the cloud service while your PC is off. Players use native Co-op to create/join four-character rooms, up to eight players. Match rooms reset on a service restart; profiles, collections and tickets are stored in PostgreSQL through DATABASE_URL.

Free hosting can sleep or hit usage limits. The official-game update check runs on service startup and verifies compatibility before activating a new client build.
