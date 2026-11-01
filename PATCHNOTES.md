# 0.4.5 — same team, same XP, different bragging rights

- The Gay Boys Rank replaces the empty official ladder in the private main menu. Compare each trainer's best completed survival time and single-run damage. Guests count here too.
- Existing saved run receipts seed the rankings; new best records are retained across future runs and restarts.
- Private run summaries confirm their private ranking save instead of claiming a teammate disqualified everyone. Official ladders remain separate.
- All collected XP feeds one common team bar, regardless of distance or downed status. The XP requirement grows 70% for every extra player (1.7x at two, 5.9x at eight).
- XP bonuses increase the collector's contribution to the shared pool. Rare Candies and level-granting pacts also benefit the team. Cumulative contributions survive request retries without double credit.
- Gacha waits for the opening controller press to be released. Holding Cross/A no longer opens and immediately closes the window.

# 0.4.4 — something else is a hundred tickets

- Clicking Something else in the feedback window gives 100 purple tickets and saves them to your private account.
- The normal feedback category selection still works. Reward clicks do not send feedback.
- Ticket retries cannot credit the same request twice.

# 0.4.3 — the Lab remembers leg day

- Fixed permanent Lab upgrades resetting after leaving the screen. Native batched purchases now save through the private profile service.
- The same fix covers batched item purchases, archives and task/quest claims.
- Save requests capture a profile snapshot and return the normalized saved result.
- Updated the native mod bridge for official 0.8.86 while retaining verified older-build compatibility.

# 0.4.2 — a small business run by a gas ball

- Clicking an actual moving Gastly in the main menu gives one purple ticket. No extra button, no daily menu chore.
- The balance updates immediately and saves to your private account. Retrying a failed request cannot spend its ghost receipt twice.
- Menu buttons and panels keep their normal actions.

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
