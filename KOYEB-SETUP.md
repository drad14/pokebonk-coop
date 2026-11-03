# Koyeb migration — keep the existing game and Neon saves

This deployment uses the same private game, eight-player native co-op, gacha, rankings, shared XP, balanced spawns and reconnect features. The public address changes to a Koyeb address. Existing registered users sign in again on the new address; keep old browser storage for guest accounts until guest access is transferred.

## Before deployment

1. Sign in to the existing Neon project/branch used by Render. Reuse its exact DATABASE_URL; do not create an empty replacement database.
2. Read-only backup: set DATABASE_URL privately in the local environment and run `node scripts/backup-saves.mjs`. The script reads both save tables in a read-only transaction and writes an ignored local backups/ file. It never writes database rows or prints credentials. Confirm the backup contains the expected accounts/collection progress before cutover.
3. Use a Free web-service instance in a Starter/free account. Account verification may request a card or show paid-plan defaults; do not accept a paid plan to complete this migration.

## Deployment settings

- Repository: the existing private GitHub repository, drad14/pokebonk-coop; branch main.
- Builder: Dockerfile; path Dockerfile; context repository root.
- Region: Frankfurt where the Free instance is available.
- Instance: Free, one instance, not Nano/Micro/Pro.
- Public port: 8777, HTTP; route /.
- Health check: HTTP /healthz. Allow at least 90 seconds for the first official-game compatibility/cache check.
- Environment: DATABASE_URL set from a private Koyeb secret pointing to the existing Neon branch; HOST=0.0.0.0 and PORT=8777 are already set in the image. The application reads KOYEB_PUBLIC_DOMAIN automatically for its share links, and KOYEB_GIT_SHA for deployment verification.
- No database passwords in GitHub, Docker build arguments, deployment links, screenshots or chat.

Koyeb must be granted access to only the required repository. Entering the Neon connection secret into the new host grants it database access; confirm that specific transfer before configuring it. Signing up/accepting account terms or handling card verification is a user step.

## Cutover checks

Verify /healthz reports status=ok and storage=postgres, with the expected Git commit. Compare the existing save row with the read-only backup before letting users spend currency. Check room creation/joining and the authenticated native WebSocket relay using minimal traffic; run heavy gameplay tests locally so remote testing does not exhaust bandwidth again.

Keep the old Render service paused/suspended once Koyeb is verified. Do not run two independent profile writers against the same save row; Render may otherwise resume when its allowance resets. Do not delete the Render service or Neon project during migration.

Free resources have provider limits. The Free Koyeb instance has limited CPU/RAM and can scale to zero after inactivity; validate the real workload before promising eight-player performance. Existing free-tier game/relay bandwidth behavior still applies.
