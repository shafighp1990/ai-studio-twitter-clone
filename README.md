# Arrisches Communication

Social network and guest video meetings, hosted entirely on Cloudflare at https://ai-studio-twitter-clone.aistudiotest.workers.dev.

## Runtime

- Next.js / OpenNext on Workers; D1 for accounts, sessions, social data and meeting signaling.
- R2 for profile and post images.
- Browser WebRTC for encrypted audio/video, with Cloudflare TURN fallback on restricted networks.
- No Supabase SDK, runtime requests, authentication or storage dependencies. Historical SQL under `supabase/migrations` is retained only as an archive.

Existing account password hashes are migrated unchanged. Users sign in again with their existing passwords. New registrations use bcrypt, opaque HttpOnly sessions and optional encrypted TOTP authentication. Signup currently does not send verification emails or self-service reset emails; administrators can issue temporary passwords from the admin panel. No email delivery provider is configured. The application does not advertise an email as verified merely because an account exists.

## Meetings

Signed-in users create rooms at `/meetings`. The guest opens the invitation, enters a name and joins without registering. Invitations contain a random secret in the URL fragment, expire after 24 hours and can be replaced by the host. Guest sessions and TURN credentials last eight hours; there is no one-hour cutoff. Hosts can end the room for everyone. Maximum six participants; one-to-one calls are the primary use case. Larger rooms use a full mesh and require more bandwidth. Camera/microphone toggles, audio-only entry, listening and screen sharing are supported. The server does not record media. Keep the browser tab open while calling.

At 2 Mbit/s video per person, a fully relayed two-person one-hour call uses approximately 1.8 GB outgoing video, roughly 2–2.2 GB including audio and transport overhead. Direct connections do not consume Cloudflare video egress. For N participants in a full mesh, approximate relayed GB/hour is `0.45 × N × (N−1) × bitrate_Mbit/s`, plus overhead. Actual usage depends on negotiated bitrate, screen sharing and connection routes. Cloudflare Realtime's first 1,000 GB/month is shared by TURN and SFU; separate Workers/D1/R2 quotas apply.

## Administration

The Persian RTL dashboard at `/admin` is available only to designated administrators. It shows paginated/searchable accounts, posts, media, rooms, allowlisted database records and an audit log. Administrators can delete posts (including dependent replies), remove images, end rooms, suspend/restore accounts, revoke sessions and issue temporary passwords. Image removal blocks the old URL immediately and clears matching post/profile references before deleting the R2 object.

Passwords, session/invitation tokens, MFA secrets and private WebRTC payloads are never exposed in database views. Password resets generate a new temporary password displayed only once. The account must change it before using protected features; enabled MFA still applies. Resetting/suspending an account revokes its sessions and ends its hosted rooms. Password changes invalidate prior sessions using an account authentication version. An administrator cannot suspend their own account or another administrator through this panel. Own password changes are at `/auth/change-password`.

Apply `0003_admin.sql` before deploying this version. Grant the administrator role out of band to a verified owner account; registration and profile updates cannot assign roles. Never put initial admin credentials in source control. The initial owner password is handed over privately and must be changed on first login.

## Development

```sh
npm ci
npm run cf-typegen
npx wrangler d1 migrations apply DB --local
npm run dev
```

Open `http://localhost:3000`. Put server-only `TURN_KEY_ID`, `TURN_KEY_TOKEN` and `AUTH_ENCRYPTION_KEY` in ignored `.dev.vars`; the auth key is 32 random bytes encoded as base64. Never expose these as `NEXT_PUBLIC_*` variables. Local D1/R2 data are isolated from production. Production resource bindings are in `wrangler.jsonc`.

## Deployment

```sh
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_TOKEN
npx wrangler secret put AUTH_ENCRYPTION_KEY
npm run deploy
```

Preserve `AUTH_ENCRYPTION_KEY` across deployments so enrolled authenticators remain usable. Production secrets are maintained in Workers secret storage. Do not include private exports or test credentials in Git. Back up D1 before schema/data changes; D1 Time Travel is available for recovery according to the account plan.

## Validation

```sh
npm run lint
npx tsc --noEmit
npm run build:cloudflare
npm audit --omit=dev
node tests/integration.mjs
node tests/admin.mjs
```

The integration test defaults to localhost and creates synthetic accounts. It verifies authentication, CSRF, guest invitations, invalidation, signaling authorization, room ownership, social ownership and TOTP replay prevention. Use a disposable local database. For deliberate deployment verification, set `TEST_URL` and `TEST_CLEANUP_FILE`; remove only the listed synthetic rows after the run. The audit's remaining `braces` advisory is confined to the development lint toolchain; production dependency audit is clean at migration time.

The app preserves posts, replies, reactions, follows, bookmarks, notifications, multilingual layouts (German, Persian, Ukrainian, Arabic), external source cards, profile editing and image uploads. API handlers enforce identity and ownership; clients cannot choose an acting user ID. Uploads are restricted to raster images under the owner's path. TOTP secrets are encrypted with AES-GCM; reused codes are rejected.

The admin suite is strictly localhost-only, refuses remote target variables, creates disposable accounts and removes their exact records afterward. It checks privilege boundaries, all database views, image/post moderation, room closure, password reset and forced change, session revocation, suspension and audit redaction.
