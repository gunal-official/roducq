# Invite email setup and staging verification

How team-invite email works, what it needs, and how to prove it works in
staging **without touching production**.

## What the code does

1. `createTeamInviteAction` inserts the `team_invites` row **first**.
2. It then calls `sendInviteEmail` (`lib/invite-email.ts`) as a best
   effort. Email can never block or undo invite creation.
3. On failure the invite still exists, appears under **Pending invites**,
   and the inviter is shown its copy link.

Three outcomes:

| Outcome | `reason` | UI |
| --- | --- | --- |
| All five vars set, send succeeded | — | "Invite created" |
| All five vars set, send threw | `send-failed` | warning + copy link |
| Any var unset/unusable, **localhost** | `not-configured` | silent (dev is copy-link only) |
| Any var unset/unusable, **deployed host** | `not-configured` | warning + copy link, logged with the unset variable names |

## Required variables

All five, or no email is attempted at all.

| Variable | Example shape | Notes |
| --- | --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` | Plain hostname |
| `SMTP_PORT` | `465` or `587` | `465` = implicit TLS, anything else = STARTTLS. TLS mode is derived from the port; there is no separate flag |
| `SMTP_USER` | `you@gmail.com` | Full address |
| `SMTP_PASS` | *(secret)* | Gmail: an **App Password**. A normal account password is rejected |
| `SMTP_FROM` | `Roducq <you@gmail.com>` | Shown to the recipient. Must be an address the account is allowed to send as |

`RAZORPAY_*` variables are unrelated to this feature.

## Proving presence without revealing values

Paste into a terminal that has the Vercel CLI linked to the project. This
prints **only names and whether a value exists**:

```bash
for v in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM; do
  if vercel env ls production 2>/dev/null | grep -q "^$v\b"; then
    echo "$v: PRESENT"
  else
    echo "$v: MISSING"
  fi
done
```

Any `MISSING` explains the failure without anyone reading a value.

## Reading the failure cause

On a deployed host a failed send logs exactly one line:

```
invite email failed [auth]: Invalid login: 535 5.7.8 …
```

The bracket is the classified cause:

| Code | Meaning | Usual fix |
| --- | --- | --- |
| `auth` | 535 — username/password rejected | Gmail: create an **App Password**; a normal password never works |
| `sender-rejected` | 553 — `SMTP_FROM` not permitted | Make `SMTP_FROM` match the authenticated account (or a verified alias) |
| `recipient-rejected` | 550 — the invitee's address was refused | Confirm the address with a different inbox |
| `connection` | DNS, refused, TLS or timeout | Wrong host/port, or the host blocks outbound SMTP. Prefer `465` and check the provider allows SMTP |
| `unknown` | Anything else | Read the redacted detail on the same line |

The detail is redacted before it is logged: URLs, UUIDs (invite tokens)
and newlines never reach the log. **Copy an invite link from the UI, never
from a log.**

### Timeouts

The send is bounded at 10 s to connect, 10 s for the greeting and 15 s of
socket idle time. nodemailer's own defaults are 2 minutes and 10 minutes —
longer than a serverless invocation may live, so an unreachable SMTP host
would hang the request instead of reporting a failure. Every other
outbound call in this repo is bounded the same way.

## Verifying in staging

1. Add a **Preview/Staging** deployment (do not use the production URL).
2. Set the five variables on that environment only.
3. Open **Settings → Team** and invite an address at your mail sandbox
   (Mailtrap, MailHog, or a real inbox you control).
4. Expect: "Invite created" with **no** warning, and the message arrives
   in the sandbox.
5. Then prove the fallback: unset `SMTP_PASS` on the staging environment,
   redeploy, invite a second address. Expect the warning *"email is not
   configured on this server"* and a working copy link — the invite row
   still exists.
6. Restore `SMTP_PASS`.

Local development needs none of this: with no SMTP configured, invites are
created and copy-link works silently.

## Retries and duplicates

There is **no resend action**. The app creates one pending invite per
`(workspace, email)` — a partial unique index, `team_invites_one_pending_per_email`,
covers rows where `accepted_at` and `revoked_at` are both null.

So:

- Inviting the same address again while a pending invite exists returns
  *"There's already a pending invite for this email."*
- To retry delivery, **revoke** the pending invite, then create it again.
- Revoking keeps the row as an audit trail, so the unique index no longer
  applies to it and a fresh invite can be created.

Automated tests exercise delivery against an in-process SMTP mock
(`tests/helpers/smtp-mock.ts`). They never send real mail.
