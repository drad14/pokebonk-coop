# PokéBonk co-op 0.3.1

Eight-player private co-op, shared party XP and animated Pokémon gacha. Tested against PokéBonk 0.8.81, build `mvv1omyf`. Separate from official accounts, servers, saves and rankings.

## Update an existing installation

Close the server window. Extract **PokeBonk-Coop-update-0.3.1.zip** directly into your existing game folder, the one containing **server.js**. Replace files when asked. The update contains no data or cache folders and keeps your existing saves in place. Run **Start PokeBonk Multiplayer.bat** again, choose **2**, and send friends the new link. Everyone should refresh to receive the new client code.

## First installation

1. Extract the full ZIP into a normal folder. This is a server, not a Chrome extension.
2. Only the host needs Node.js 18 or newer. Install an LTS release from https://nodejs.org/.
3. Run **Start PokeBonk Multiplayer.bat** and choose **2** for internet play.
4. Host opens **http://localhost:8777** first and chooses **Play as a guest!**.
5. Send friends the internet link from the console. They open it and choose **Play as a guest!**. No join username/password prompt and no extension install.
6. Open **Party** on the main menu: up to **8 players including the host**. Everyone picks a Pokémon, then the host starts the run.

Keep the server console and host's game tab open. Closing the console stops sharing. The internet link changes when the tunnel restarts; this is not 24/7 cloud hosting. Anyone with the current link can connect. First launch downloads dependencies, public game assets and Cloudflare's tunnel tool. Enable browser hardware acceleration for gameplay.

## In-game menus

The floating bottom-left control panel has been removed. **Party** and **Gacha** are normal main-menu tiles with the game's own icons, styling and keyboard/controller navigation. They occupy the tile spaces previously used for official-only Clan and Ranking services, which are unavailable on this private server.

**Party** opens a native game screen with the player list, invite link, trainer-name field and graphics options. During a run, pause the game and choose **Party**. Back returns to the pause screen without ending or restarting the run. Player names/health bars above characters remain gameplay UI.

## Shared XP

- There is one set of XP gems and one party XP bar. A gem collected by anyone disappears for everyone and awards XP exactly once.
- Everyone receives the same level, XP remainder and next-level threshold. Each player still chooses their own upgrades.
- XP-gain bonuses are averaged across the party, so bonuses contribute to shared progress instead of making personal bars diverge. Normal difficulty XP scaling remains.
- Direct XP rewards and candy level gains feed the same party progression. Coins, items and collection rewards remain personal.
- Late joiners catch up to the host's current shared level/bar and receive the corresponding queued level-up choices. Replayed pickup/reward messages do not grant extra XP.
- Choice menus and the existing co-op waiting behavior are unchanged by this patch. The XP state can update while someone is choosing.

## Gacha

Open **Gacha** on the main menu between runs.

- Start with **10 tickets**. Pull x1 costs 1; pull x10 costs 10.
- Finished runs award **1 per full minute** (up to 20), **1 per boss** (up to 5), and **5 for victory**. Maximum 30. Zero-progress runs give zero.
- Pulls unlock **79 playable League members**. Pick them in the normal League screen after closing gacha.
- Odds: **60% common, 30% uncommon, 9% rare, 1% legendary**. Members within a rarity are equally likely. No pity counter.
- Shiny: independent **1/128 per pull**, about 0.78%. Owning a Pokémon does not reduce the chance. Shiny looks unlock in the normal wardrobe and are not automatically equipped.
- Duplicate normal Pokémon give **15 stardust**; duplicate shinies give **50**.
- A Poké Ball winds up, opens with a rarity-colored burst, then reveals the cards in sequence. **Skip animation** shows saved results immediately. Reduced-motion / reduced-flash settings bypass the reveal sequence. No new audio added.
- Rewards save before the animation. Skip never purchases or rerolls anything. On a failed connection use **Retry last pull**; the same request does not spend twice. The server retains 20 request receipts.
- Keyboard: Tab / Enter; Escape skips an active reveal, then closes gacha. Inside gacha, controller D-pad/stick moves; **PlayStation Cross / Xbox A** confirms, **Circle / Xbox B** skips or closes. Open gacha with its on-screen button.

An open gacha screen defers automatic joining until closed. No real-money purchases.

## Saves and assets

Private saves are in **data/accounts.json** on the host. Back up this file. Keep **cache**: pinned game files may disappear upstream. The ZIP excludes saves, game assets and dependencies. The old join-code file, if present, is no longer used.

Guest sessions use browser storage for that address. Official accounts/progress are not imported. Named private accounts are a convenience for trusted friends, not the official password system; do not use official credentials. Your PokeSurvivor extension is separate and unchanged.

## Validation and limitations

Version 0.3.1 was checked in the actual game: main-menu tiles and native keyboard activation, Party roster/name/invite, narrow layout, gacha purchase and reveal, controller navigation/copy/back, and pause-menu Party/Back/resume. All functional assertions passed. The isolated headless browser emitted two audio-device warnings; no page JavaScript errors were reported. The 10 existing co-op/XP/gacha regression checks passed.

`npm test` checks gacha spending/retries, duplicate/shiny rewards, eight-peer capacity, host-only XP authority, shared XP for eight simulated players, simultaneous/repeated collections, direct XP/candy rewards, late joins, reordered/retried XP events, and gem consolidation without early/double rewards.

Native game integration was tested with a real host browser plus a simulated WebSocket guest, then a real guest browser plus a simulated host. Native gem creation/collection, the exact XP remainder/threshold, and one queued level-up per gained level passed. Concurrent two-browser full-game checks encountered loading timeouts in software rendering; this release does not claim a completed eight-human late-game playtest.

Gacha animation checks used the real account/pull API with the reveal UI in a lightweight browser fixture: timed reveal, repeated skip, ticket balance and reduced motion passed. Previous 0.2.0 gameplay checks covered two actual clients plus six simulated teammates sharing enemies. Remote HTTP and WebSocket checks confirm no join password is required. The internet transport itself previously passed a real Cloudflare HTTPS test.

Quick tunnels have no uptime guarantee. Save/resume and reconnect recovery in long runs remain experimental. Official social services, seasons and rankings are not reproduced. Private run rewards differ from the official service.

Bloodthirster, Heartsteel, La Ming Ya Mao, TM cheats and extra item slots are not included in this patch.

## Attribution

Based on MIT-licensed mod code from https://github.com/vacfeg/pokebonk-multiplayer, commit `4d16c5464ca65312bbd0e27b4b001921890987cd`. See LICENSE and UPSTREAM.md.

The ZIP includes mod code and playable-catalog metadata, not original game bundles, models or sounds. Public game files download from the original site into cache. PokéBonk and original assets belong to their creators; the mod's MIT license does not license those assets. No affiliation with the original game.
