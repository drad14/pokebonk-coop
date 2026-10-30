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
