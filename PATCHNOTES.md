# 0.4.1 — eight seats, now with the other four visible

- Fixed the native lobby refresh loop, capacity counter and ready portraits. All eight slots now render; the ninth player still gets the door.
- Eight-player teammate search is selectable, with eight selected by default in a new private lobby. Smaller searches show their actual capacity.
- Gacha now uses the game's own panels, colours and Stardust icon. Rewards roll and reveal individually, with rarity colours and a Reveal all button.
- Closing and reopening Gacha clears the previous results and resets its controls. Saved rewards stay saved.
- Fixed menu scenery surviving into Viridian Forest after a gacha pull. The Halloween welcoming committee is no longer invited into your run.
- Menu refreshes dispose the previous scene and its placeholder sprite. Repeated pulls no longer collect spare castles.
- Unhashed sprites, map models and data now cache separately for each official build and asset revision, preventing mixed-version visuals.
- Fixed loader cache busting when multiple official game builds exist in the server cache.
- Validated against official PokéBonk 0.8.84 / mvw6ep5y. Gacha odds are unchanged.

# 0.4.0 — co-op has entered the co-op game

- Rebuilt around official PokéBonk 0.8.83 and its real co-op. The old sidecar multiplayer has retired.
- Native rooms, ready checks, teammate health, revives and boss synchronization, with eight seats maximum.
- Native packets get a private relay fallback when direct connections refuse to socialize.
- Team damage now has a leaderboard. Do more damage, move up. The numbers have learned competition.
- Controller input gets a deadzone and cleanup on focus/reconnect. F8 resets it; release your stick and buttons afterward.
- Neon saves are connected through DATABASE_URL. Tickets no longer aspire to be temporary files.
- Official game checks happen at startup; incompatible updates are surfaced instead of quietly borrowing old sprites forever.
- Gold/purple tickets, native pickups, x100 pulls and dust rewards stay.

Validated: nine automated checks, eight native network participants, two real game clients, remote health changes and damage overtakes over direct and forced-relay paths. This is not a completed eight-human late-game playtest.
