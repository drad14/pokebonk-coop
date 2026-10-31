# PokéBonk private 0.4.0

Private website based on the current official PokéBonk client: verified with **0.8.83 / mvv70wso**. Friends receive the update by refreshing your Render address.

## Native co-op

The custom world-mirroring game loop and replacement Party screen are removed. Use the game's **Co-op → Create room / Join with code**, ready buttons, map/difficulty selection, native multiplayer simulation, teammate health bars, boss synchronization, revives and return-to-lobby flow. Codes use the native four-character format. Rooms support **eight players maximum**; the native roster and private capacity controls are expanded to eight. Normal native behavior remains the baseline, with scaling extended for players five through eight.

The private backend supplies room membership, readiness, chat and WebRTC signaling. Direct native WebRTC is preferred. If it cannot open, an authenticated WebSocket fallback carries the same native control and binary snapshot packets through your private server. It does not replace native combat or create a second simulation. The fallback waits eight seconds before taking over an unavailable direct connection and uses backpressure to drop stale snapshots. Rooms and matches end on server restart; saved profiles do not when PostgreSQL is configured.

The private service has its own accounts. It does not connect to official accounts, social servers or leaderboards. Native invites to official friends are not reproduced: share your private room code. Public matching, when selected, only matches visitors to this private site. The first/lowest native slot coordinates game events in the normal native way; the owner's PC need not be online.

## Mods

- **Team damage leaderboard:** compact panel on the left, sorted by native total damage. Overtaking another player moves your row above theirs. Updates twice per second using native totals; it does not introduce a second damage stream. Larger parties get a compact teammate-health layout.
- **Controller recovery:** ignores small left-stick drift, clears stale native input on focus/disconnection/reconnection, and waits for neutral sticks/buttons before resuming. **F8** resets controller input without unplugging; release the stick and buttons afterward. Driver/hardware faults can still require device troubleshooting.
- **Gacha:** x1/x10/x100; one roll costs 10 gold tickets or 1 purple ticket. Old tickets remain purple. Balances appear in the main-menu currency strip.
- **Loot:** defeated Pokémon have a 1% gold / 0.1% purple ticket chance. Tickets use native ground-loot physics and must be collected. Drop/collection retries are idempotent. Finished-run rewards remain purple.
- **Rolls:** 50% 100 dust, 20% 1000 dust, 5% 2000 dust, 25% Pokémon. Pokémon rarity weights are 60/30/9/1 within Pokémon results. Shiny chance is 1/128 per Pokémon result (1/512 per roll overall). No pity counter. Duplicate Pokémon give 15 dust, or 50 for duplicate shinies.

## Saves

Set **DATABASE_URL** in Render to your Neon PostgreSQL connection string. It stays in Render's secret environment settings, never in this repository. This release actually uses it. Startup creates the private save table if needed, loads the saved accounts, and fails rather than resetting them if the database cannot be read. Revision checks prevent an older server instance overwriting newer saves. Profile mutations are serialized, and gacha/loot success is returned only after saving.

Render deployments require DATABASE_URL. A local installation without it uses data/accounts.json. If an existing local file is available when an empty database is initialized, it is imported without overwriting an existing database row. Saves already lost from an older Render ephemeral filesystem cannot be recovered by this migration. Keep backups; guest sessions are tied to the website/browser storage.

## Official game updates

On each server startup, the server fetches the official version and current entry/game bundles. It activates an update only when every required mod/protocol compatibility check passes. Game version appears on the menu and /healthz. Unsupported changes are reported in updateError and leave the last verified copy active rather than silently breaking a live game. New upstream changes can still require adapting a mod; arbitrary future versions cannot be guaranteed compatible. Running matches are not switched between game builds mid-session.

## Render

Use the included render.yaml (Node, Free) or build with npm ci and start with npm start. Set DATABASE_URL first. HOST=0.0.0.0, Render's port, and RENDER_EXTERNAL_URL are supported. Free hosting can sleep while unused and take time to wake. Direct peer traffic avoids server relay bandwidth; fallback traffic uses your hosting allowance.

## Validation

Nine automated checks cover native eight-player capacity/ninth-player rejection, signal isolation, readiness, ticket spending/retries, dust rewards, pickup credits, controller recovery, save persistence/concurrent-writer rejection, update validation, and relay authentication/binary forwarding.

Native browser integration verified eight native lobby/network participants reaching a full mesh and rejecting a ninth. Two actual game clients verified native co-op, changing remote health, native damage totals and leaderboard reordering. The same health/damage checks passed with direct offers deliberately disabled in test browsers, forcing the relay fallback. These are isolated test accounts, not your saves. Eight-human late-game performance and arbitrary home-network conditions remain unverified. Live Neon connectivity is checked after deployment; database unit checks use a mock driver.

Original game bundles/models/sounds are fetched into cache, not included in this repository. Keep the cache where practical. See LICENSE and UPSTREAM.md for mod attribution; the mod license does not license original game assets.
