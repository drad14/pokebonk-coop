# Render setup

This Free blueprint is for testing. Local profiles, collections and tickets reset when Render restarts, redeploys or sleeps. Permanent saves need an external database before using this for lasting progression. No database credentials or paid resources are included.

1. In Render select New > Blueprint.
2. Connect GitHub and allow access to drad14/pokebonk-coop.
3. Select this repository and apply its render.yaml. Confirm the service plan is Free.
4. Wait for deployment, then open the HTTPS onrender.com URL displayed by Render.
5. Share that URL with friends. No Node installation or join password is required on their computers.

Render automatically supplies the public address and port. The server serves HTTP and WebSockets. Do not set --internet or start Cloudflare on Render.

The free service sleeps after 15 idle minutes; opening it wakes it with roughly a minute delay. Your PC can be off. The first connected player hosts each match in their browser; leaving that browser ends that match. This is one shared eight-player party per server.

Original game files download from pokebonk.com. A successful health check does not prove assets remain available or gameplay works. Verify the game loads and two friends can join after deployment. The pinned old build can fail if the original site removes its assets.

Sources: https://render.com/docs/free and https://render.com/docs/environment-variables
