# Password recovery — implementation

Secure, production-ready password recovery on the existing Supabase Auth
stack (`@supabase/supabase-js` 2.117 + `@supabase/ssr` 0.12.7, PKCE).
RoduCQ implements **no** custom reset tokens and stores **no** passwords;
Supabase owns token generation, expiry, single-use, hashing, and its
dashboard rate limits. No service-role credential reaches the browser.

## User flow

1. `/login` → **Forgot password?** → `/forgot-password`.
2. User enters an email → `supabase.auth.resetPasswordForEmail(email,
   { redirectTo })` where `redirectTo` is built from the caller's own
   origin: `<origin>/auth/callback?next=/reset-password&recovery=1`
   (never hardcoded — production mail can never point at localhost).
3. The page shows the neutral confirmation regardless of whether the
   address is registered: *"If an account exists for that email, you'll
   receive a password reset link."*
4. The email link lands on `/auth/callback`, which exchanges the PKCE
   code server-side, sets the recovery-grant cookie, and redirects to
   `/reset-password`. Expired/already-used links (Supabase appends
   `error_code=otp_expired`) land on `/reset-password?error=expired`,
   which explains the problem and offers a new link.
5. `/reset-password` confirms recovery proof, the user enters and
   confirms a new password, and a server action calls
   `supabase.auth.updateUser({ password })`. On success the grant is
   consumed, the recovery session is signed out, and the user signs in
   fresh at `/login`.

## Routes

| Route | Kind | Purpose |
| --- | --- | --- |
| `/forgot-password` | page `(auth)` | Email form, neutral confirmation, back to sign in |
| `/reset-password` | page `(auth)` | New + confirm password, requirements, expired-link handling |
| `/reset-password` `updatePasswordAction` | server action | Re-validates input + recovery proof, calls `updateUser` |
| `/auth/callback?recovery=1` | route handler | PKCE exchange → grant cookie → `/reset-password` |
| `/auth/recovery/status` | route handler | Boolean only: does this session carry recovery proof? |
| `/auth/recovery/claim` | route handler | Mints the grant for browser-established recovery sessions (AMR-gated) |

Supported link shapes (the reset page handles all without assuming one
token format): PKCE `?code=` via the callback, a `?code=` delivered
straight to `/reset-password` (exchanged client-side, then claimed),
and implicit `#type=recovery` links (the browser client's
`PASSWORD_RECOVERY` event, then claimed). Fragments/codes are stripped
from the address bar with `history.replaceState` and never logged.

## Security protections

- **No account enumeration** — identical neutral confirmation for
  registered/unregistered addresses; unknown provider errors collapse
  to the same outcome. Only rate-limit and transport failures get
  distinct, existence-agnostic messages. Supabase rate limiting is
  preserved (nothing retries or bypasses it).
- **Recovery proof, not just a session** — a normal authenticated
  session cannot set a password here. The callback mints
  `roducq-pw-recovery`: an httpOnly, SameSite=Lax, 30-minute cookie
  whose value is `expiry.HMAC-SHA256(expiry, access_token)`. The server
  action re-verifies it against the *current* session token (timing-safe
  compare), so it can't be forged, replayed under another session, or
  reused after a successful update (it is deleted). Sessions minted
  directly by a recovery link are recognised via the JWT AMR claim
  (`otp`/`recovery`, ≤30 min old) — the token is only decoded after
  `getUser()` has verified it, never logged or returned.
- **Open-redirect prevention** — `next` is re-validated server-side
  (same-site absolute paths only, `//` and backslashes rejected); a
  recovery callback always lands on `/reset-password`; the recovery
  `redirectTo` origin must be a credential-free http(s) origin.
- **Middleware intact** — `/forgot-password` joins the signed-in bounce
  list; `/reset-password` is deliberately excluded (a recovery link
  *creates* a session; bouncing it would break recovery, and the grant
  gate means a normal session gains nothing there). Nothing bypasses
  the existing middleware.
- **No secret logging** — passwords, codes, tokens, and cookies are
  never logged (enforced by a source-contract test). Passwords go
  straight to Supabase via `updateUser`; the service-role key is never
  referenced by any recovery file.
- **Fresh-browser safe** — the primary flow needs no pre-existing
  storage: the email link itself, exchanged server-side, creates the
  session + grant in whatever browser opens it.

## Password rules

Minimum 8 characters including a letter and a number, maximum 72,
confirmation must match; Supabase "weak password" / "same as old"
responses are mapped to friendly messages. Internal provider details
are never shown to users.

## Error handling

Missing/invalid email (inline, `role="alert"`, `aria-describedby`),
expired link, already-used link, missing recovery session, weak
password, password mismatch (announced live as you type), network
failure, Supabase rate limiting, and success — each covered in
`lib/auth/password-recovery.ts` (`mapResetRequestError`,
`mapPasswordUpdateError`, `parseRecoveryLinkError`) and unit-tested.

## Required Supabase configuration (operator)

No dashboard settings were changed by this PR. Before announcing the
feature in production, an operator must confirm in the Supabase project
for `https://roducq.nanexi.com`:

1. **Authentication → URL Configuration**: Site URL
   `https://roducq.nanexi.com` and Redirect URLs including
   `https://roducq.nanexi.com/auth/callback**`. For local/preview
   testing add the matching `http://localhost:3000/auth/callback**`
   (and any preview origin) entries — the app always builds
   `redirectTo` from the serving origin, so no code change is needed
   per environment.
2. **Authentication → Email Templates → Reset Password**: the template
   must link to `{{ .ConfirmationURL }}` (the default does).
3. **Authentication → Settings**: confirm the email rate limits and
   OTP/recovery expiry are acceptable (defaults are fine).
4. Send a real reset email to a real inbox and complete the flow once
   (below). **Reset-email delivery is not verified until this is done**
   — automated tests mock Supabase and send nothing.

## Tests

- `tests/lib/password-recovery.test.ts` — form validation, neutral
  messaging, exact mocked `resetPasswordForEmail` call shape, redirect
  URL construction + allowlisting, password strength/confirmation,
  expired/invalid link parsing, AMR recovery-session detection, and
  grant-cookie binding/expiry (unauthenticated, normal-session, and
  replay cases). Supabase is mocked; no real emails.
- `tests/components/password-recovery.test.ts` — route inventory,
  Forma component reuse (AuthCard/AuthField, 44px+ controls), login
  link, recovery gating in the server action, callback grant minting,
  middleware behaviour, and the no-service-role/no-logging contracts.
- `scripts/verify-responsive.mjs` gained `forgot-password` and
  `reset-password` fixtures; the Phase F inventory counts were updated
  (33 pages / 17 handlers). The full sweep (320–1440px) passes.

## Verification (this PR)

- `npm test` — 858+ tests passing (run before opening the PR; see PR body).
- `npm run lint`, `npx tsc --noEmit`, `npm run build` — clean.
- `npm run verify:db`, `npm run verify:pdf` — pass.
- `npm run verify:responsive` — pass at 320/375/414/600/768/1024/1440
  with the new pages included (real Chromium).
- Screenshots in `docs/screenshots/password-recovery/` — light + dark
  at 375/768/1440 for login, forgot-password, and reset-password states
  (including the neutral confirmation and the ready-to-reset form),
  captured in Chromium against a local production build with the
  Supabase endpoint stubbed at the network layer (no real account or
  email involved). `capture-report.json` records zero horizontal
  overflow and a visible 2px focus outline as the first Tab stop on
  every capture.

## Manual production verification (operator, after deploy)

1. Ensure the Redirect URLs above are saved in the Supabase dashboard.
2. In a private window, open `https://roducq.nanexi.com/login` →
   Forgot password? → enter a real account email → confirm the neutral
   message.
3. Open the email link in a *different* browser/profile → confirm the
   "Set a new password" form (not a bounce to the app) → set a new
   password → confirm you're sent to sign in → sign in with the new
   password.
4. Re-open the same (now used) link → confirm the expired-link message
   with a working "Request another reset link".
5. Request a second reset, wait past the link expiry (or use it after
   requesting a newer one), and confirm the expired state again.
6. While signed in normally, visit `/reset-password` directly →
   confirm it refuses ("needs a password reset link") instead of
   changing the password.
