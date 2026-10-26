# Connect Google Calendar and Gmail

The implementation is local and uncommitted in `feature-platform`. Live Google access needs the provider configuration below. Existing Auth0 sign-in continues to work while Google setup is disabled.

## 1. Google Cloud and Auth0 connection

Use a Google Cloud project with Gmail API and Google Calendar API enabled. Create a Web OAuth client for Auth0 and add `https://dev-bqbiqw7tlva270ni.us.auth0.com/login/callback` as its redirect URI (confirm the exact URI shown by the Auth0 Google connection). Configure the OAuth consent screen and add your Google account as a test user while testing.

In Auth0 → Authentication → Social, create/configure `google-oauth2` using those Google client credentials. Enable **Connected Accounts for Token Vault**, Token Vault, and offline access. Enable this connection for both the existing News4You SPA and the new server application in step 3. Keep the existing login provider available: the server callback requires the same News4You user identity.

The connection requests only these provider scopes (in addition to identity):

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`

Gmail's read-only grant covers the mailbox. Settings supports No email, All recent mail, or A label I choose. Each edition reads at most eight messages from the 24 hours before collection starts, excluding Spam and Trash. Label mode always includes `labelIds` and checks membership again; all-mail mode requires an explicit saved choice. Existing saved settings retain their prior label-only or disabled behavior. Attachments are skipped. There is no send, modify or calendar-write permission.

Google may require verification for public deployment of Gmail restricted scopes. External apps in Testing can have short-lived authorization; check the Google consent-screen status if a connection stops working. Do not enable paid services to bypass this.

## 2. Existing Auth0 SPA

Activate **Auth0 My Account API** in Applications → APIs. In its Application Access tab, authorize the existing News4You SPA for the Connected Accounts permissions:

- `create:me:connected_accounts`
- `read:me:connected_accounts`
- `delete:me:connected_accounts`

Enable skipping consent for this first-party API. In the SPA's MRRT configuration enable My Account API. Enable Refresh Token grant and offline access for the News4You API. Configure My Account API DPoP as **Supported**, rather than **Required**, for this implementation; the current Hono API uses bearer authentication. Do not enable DPoP-bound tokens for the SPA without adding proof validation to the API.

Keep these allowed SPA callbacks:

- `http://localhost:5173/today`
- `https://news4you.njabulomajozi.com/today`

## 3. Separate server Auth0 application

Create a **Regular Web Application**, named for example `News4You Google Publisher`, in the same tenant. This is separate from the SPA: its client secret stays server-side.

- Enable Authorization Code, Refresh Token and Token Vault grants.
- Use a confidential client with `client_secret_post` authentication.
- Allow callbacks `http://localhost:8787/oauth/google/callback` and `https://api-news4you.njabulomajozi.com/oauth/google/callback`.
- Authorize user-delegated access to the existing News4You API (`https://api-news4you.njabulomajozi.com`) and enable Allow Offline Access on that API.
- Disable refresh token rotation **on this server application only**. Auth0's Token Vault refresh-token exchange requires non-rotating tokens. Set bounded absolute and idle lifetimes appropriate for your use; reconnect when they expire.
- Enable the same login connection you use for News4You, plus the Google Connected Accounts connection.

Add the new application credentials in `apps/api/.dev.vars`, never in dashboard env files:

```dotenv
AUTH0_GOOGLE_CLIENT_ID=your-new-server-application-client-id
AUTH0_GOOGLE_CLIENT_SECRET=your-new-server-application-client-secret
AUTH0_GOOGLE_CONNECTION=google-oauth2
GOOGLE_CALLBACK_URL=http://localhost:8787/oauth/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=already-generated-locally
```

The encryption key is a random 32-byte base64url value generated locally. Keep it stable: changing it makes stored connections unreadable. Do not copy the literal placeholder above over it. A production deployment must install the same key and server credentials as Worker secrets and use the production callback URL from `wrangler.toml`.

## 4. Enable and connect

After steps 1–3, set in `apps/dashboard/.env.local`:

```dotenv
VITE_GOOGLE_CONNECTION_ENABLED=true
VITE_AUTH0_GOOGLE_CONNECTION=google-oauth2
```

Restart local development. Sign out and back into News4You to obtain the new refresh-token policy. Open Settings:

1. **Connect Google**: consent to the read-only Google permissions.
2. **Enable daily access**: authorize the server application using the same News4You login. The API verifies the signed ID token, nonce and account ownership before accepting a server refresh token.
3. In Settings choose All recent mail, A label I choose, or No email, then save Google choices. Label mode requires a custom Gmail label. You can independently turn primary-calendar collection off. No email means no Gmail reads.
4. Request a new preview edition to exercise the connection without overwriting today's saved daily edition.

Publication runs in Cloudflare Workflows. Hosted Gemma edits public news/weather only; email subjects, senders and received times and calendar events are displayed directly, without AI. Email bodies are not collected. The unpaid hosted Gemma endpoint must not receive real email or calendar text. Public-source editing and the fictional demo remain available. Google tokens remain in Auth0 Token Vault; an encrypted Auth0 refresh token is stored in D1, bound to the reader. The publisher receives collected items, never tokens. Raw collected source text expires after seven days; saved editions, their calendar snapshot and references remain in history. Disconnect removes the local grant and raw personal source items, then attempts Auth0 refresh-token revocation. To revoke the upstream Google grant too, remove access in your Google Account's third-party connections or Auth0's connected-account management.

## 5. Deployment and verification

Apply migration `0003_google.sql` before deploying this version of the API. Deploy through local Wrangler as already agreed. Keep `VITE_GOOGLE_CONNECTION_ENABLED=false` until the Auth0 setup is ready; deploy the enabled dashboard only after configuration. No commits are needed for these deployments.

Automatic publication runs in Cloudflare Workflows, triggered by the API and hourly Cloudflare Cron. It needs neither a GitHub publication workflow nor a running Mac.

Check a real edition against the calendar and the chosen label: today's events in the configured timezone, a selected newsletter and delivery message, no unrelated inbox messages, working source links, and browser Print / Save as PDF. This live consent/publication check is pending; fixtures verify the implementation without reading your mailbox.

## Primary documentation

- [Auth0 Connected Accounts and My Account API setup](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/connected-accounts-for-token-vault)
- [Auth0 Token Vault configuration](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/configure-token-vault)
- [Auth0 refresh-token exchange and rotation constraint](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/refresh-token-exchange-with-token-vault)
- [Auth0 React Connected Accounts examples](https://github.com/auth0/auth0-react/blob/main/EXAMPLES.md)
- [Google Gmail message list and label filter](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)
- [Google Calendar event list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)

## Public hackathon access

The Google project is now External / In production, with verified and published branding. The read-only Gmail and Calendar scopes are declared. Data-access verification still requires a real OAuth demonstration video and review. Gmail read-only access is a restricted scope; server-side access can require an independent security assessment. Merely changing to Production does not remove the 100-user cap or warnings for an unverified app.

The reviewed privacy and terms documents are published at `/privacy` and `/terms`, generated as static HTML at build time. Their public URLs are configured in Google branding. Branding verification is complete; data-access verification is not. The existing public demo does not require Gmail access.

Personal data bypasses the model. No paid AI tier or security-assessment expense has been authorized. Google’s unpaid API terms prohibit submitting personal information; changing only the model name does not change those endpoint terms.

Sources: [OAuth publishing states](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview), [restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification), [unpaid AI API data terms](https://ai.google.dev/gemini-api/terms).

## Account setup verified on 25 October 2026

The Google OAuth app is now External / In production. Its News4You branding, homepage, privacy policy, terms and authorised domain were saved; Google verified the branding and it was published. The read-only Gmail and Calendar event scopes plus openid/profile/email are declared. Data-access verification is **not approved**: Google requires scope justifications and a real OAuth/data-use demonstration video before submission. The unverified-app warning and lifetime 100-user cap still apply. No paid security assessment or billing was enabled. See `google-verification.md` for the draft evidence checklist.

## Browser return from Google

The SDK keeps tokens in memory. Returning from Google clears that cache, and localhost cannot silently restore consent. The app therefore detects the `connect_code` return before automatic callback handling. Choose **Finish secure connection** to obtain a fresh My Account API token interactively, then let the SDK validate its saved state, PKCE verifier and connection session. Choose **Open settings** to restore the newspaper API session. No tokens are persisted in browser local storage. If the user changes account or the transaction expires, Auth0 rejects completion and Settings can restart the flow.

The local Google link and daily-access grant were completed successfully. The News4You API needed Allow Offline Access enabled before Auth0 would issue the publisher refresh token; that setting is now saved. The local Gemma 4 E2B download and synthetic private-source live smoke test passed, with a 32768-token context and cloud inference disabled. A real personal edition and deployment of the new integration remain to be verified.
