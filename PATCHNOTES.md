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
