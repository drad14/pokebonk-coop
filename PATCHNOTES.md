# 0.3.3: the floor is a ticket machine

- Gold and purple ticket balances moved upstairs, next to your other currencies. Financial literacy patch.
- Defeated Pokémon can drop actual tickets. Please pick them up. Staring at them does not count.
- 10 gold tickets or 1 purple ticket buys a roll. x1, x10 and x100 are available for either currency.
- Rolls now give 100, 1000 or 2000 stardust most of the time, with a 25% Pokémon chance. The entire League is no longer hiding in every envelope.
- Existing tickets become purple 1:1. Old balances are kept; nobody has been sent to ticket bankruptcy.
- Server-owned rolls and pickup receipts stop retries from duplicating rewards. x100 animations finish before next season.
- Exact odds and validation are in README.md and the gacha menu. Storage is unchanged: Neon persistence has not been integrated; Render Free still needs external storage for saves across restarts.

# 0.3.2: wrong party, bro

- Opening the website no longer signs you up for somebody else’s adventure.
- Create a lobby, share its four-digit code, and let up to eight friends assemble. Each lobby has its own world and XP.
- Refreshing replaces your old connection instead of recruiting your own ghosts.
- Lobby codes survive 30 seconds while empty for reconnects; server restarts clear them. Host refresh still ends the running match.
- Tested separate-room snapshots/XP, capacity, reconnects, and a two-browser Create/Join/Leave flow with three refreshes.

# 0.3.1: it lives in the game now

- Removed the floating bottom-left control panel. It has officially moved out of the corner.
- Party and Gacha are native main-menu tiles, using the game's icons, layout and keyboard/controller targets.
- Party uses the old official-only Clan tile; Gacha uses the old official-only Ranking tile in this private version.
- Party has eight player slots, invite-link copy, your trainer name and graphics options.
- Party is also in the pause menu. Back returns to pause; Resume keeps the same run.
- Shared XP, gacha odds, tickets and saved progress are unchanged.

# 0.3.0: everybody gets the homework

## Party XP

- One gem pool. One XP bar. Your friend sprinting into every green dot now contributes to society.
- Gems count once even if two players grab them together. Pickup/reward retries do not print more XP.
- Everyone shares level, XP remainder and the next-level threshold. You still pick your own upgrades.
- XP bonuses contribute through the party average. Direct XP and candy levels are shared too.
- Late joiners catch up to party progression. Choice menus and waiting rules are unchanged.
- Protected XP gems from native merging so consolidation cannot accidentally count as collection. Coins can still merge.

## Open the link, play the game

- Removed the join-password gate and browser sign-in prompt. Friends open the current link directly.
- Existing saves stay in data. The old join-code file is ignored.

## Gacha gets a budget

- Poké Ball wind-up, glow, opening burst and staggered card reveals.
- Reveal colors reflect the actual saved result, including shiny/legendary pulls. Odds are unchanged.
- Skip animation, keyboard/controller skip, and reduced-motion support.
- Rewards save before the show. Skipping does not spend tickets, reroll results, or make Magikarp any less inevitable.

## Validation

Automated party/gacha/XP checks and native host/guest XP checks passed. The native checks used one game browser with a simulated peer at a time; an eight-human late-game session still needs a real group playtest. Details in README.md.
