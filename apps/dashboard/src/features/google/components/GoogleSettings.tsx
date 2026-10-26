import { Button } from "../../../components/ui/button";
import { useDraftValue } from "../../../hooks/useDraftValue";
import { api } from "../api";
import { useAuth0 } from "@auth0/auth0-react";
import { authErrorMessage } from "@news4you/core/auth/util";
import type { GoogleSettings as GoogleChoices } from "@news4you/shared";
import { useState } from "react";

export function GoogleSettings() {
  const { connectAccountWithRedirect, getAccessTokenWithPopup } = useAuth0();
  const { data, error } = api.useGoogleQuery();
  const { data: labels, error: labelError } = api.useGoogleLabelsQuery(undefined, {
    skip: !data?.connected,
  });
  const [authorize, { isLoading: authorizing }] = api.useGoogleAuthorizeMutation();
  const [save, { isLoading: saving }] = api.useGoogleSettingsMutation();
  const [disconnect, { isLoading: disconnecting }] = api.useGoogleDisconnectMutation();
  const [calendar, setCalendar] = useDraftValue(data?.settings.calendar ?? true);
  const [labelId, setLabelId] = useDraftValue(data?.settings.labelId ?? "");
  const [emailMode, setEmailMode] = useDraftValue<GoogleChoices["emailMode"]>(
    data?.settings.emailMode ?? "none",
  );
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const enabled = import.meta.env.VITE_GOOGLE_CONNECTION_ENABLED === "true";
  const result = new URLSearchParams(window.location.search).get("google");
  const stage = new URLSearchParams(window.location.search).get("stage");
  const failureDetail: Record<string, string> = {
    "code-exchange":
      "Auth0 could not exchange the authorization code. Check the publisher client credentials and callback URL.",
    "offline-access":
      "Auth0 did not issue the required offline credentials. Enable the publisher refresh-token grant and Allow Offline Access on the News4You API.",
    "identity-check":
      "The publisher could not validate the sign-in response. Use the same News4You account and retry.",
    "token-vault":
      "The Google account link could not be exchanged through Token Vault. Check the publisher’s Token Vault grant and Google connection.",
    "save-connection": "Daily access could not be saved. Try again shortly.",
  };
  async function connect() {
    setMessage("");
    setConnecting(true);
    try {
      await connectAccountWithRedirect({
        connection: import.meta.env.VITE_AUTH0_GOOGLE_CONNECTION || "google-oauth2",
        scopes: [
          "openid",
          "profile",
          "email",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar.events.readonly",
        ],
        appState: { returnTo: "/settings?google=linked" },
      });
    } catch (error) {
      const reauthenticate =
        !!error &&
        typeof error === "object" &&
        "error" in error &&
        error.error === "unmet_authentication_requirements";
      setNeedsReauthentication(reauthenticate);
      setNeedsConsent(
        reauthenticate ||
          (!!error &&
            typeof error === "object" &&
            "error" in error &&
            ["consent_required", "login_required", "missing_refresh_token"].includes(
              String(error.error),
            )),
      );
      setMessage(`Google connection failed: ${authErrorMessage(error)}`);
    } finally {
      setConnecting(false);
    }
  }
  async function approveAccountAccess() {
    setMessage("");
    setConnecting(true);
    try {
      await getAccessTokenWithPopup({
        authorizationParams: {
          audience: `https://${import.meta.env.VITE_AUTH0_DOMAIN}/me/`,
          scope: "create:me:connected_accounts",
          ...(needsReauthentication ? { prompt: "login", max_age: 0 } : {}),
        },
      });
      setNeedsConsent(false);
      setNeedsReauthentication(false);
      await connect();
    } catch (error) {
      setMessage(`Auth0 approval failed: ${authErrorMessage(error)}`);
    } finally {
      setConnecting(false);
    }
  }
  async function dailyAccess() {
    setMessage("");
    try {
      const { url } = await authorize().unwrap();
      window.location.assign(url);
    } catch {
      setMessage("Daily access could not start. Check the server configuration.");
    }
  }
  return (
    <section className="google-settings" aria-labelledby="google-heading">
      <p className="eyebrow">YOUR DAY, IN YOUR PAPER</p>
      <h2 id="google-heading">Google Calendar &amp; Gmail</h2>
      <p>
        Bring today’s meetings, delivery updates and newsletters into your edition. Choose all
        recent mail or a Gmail label for your newspaper.
      </p>
      <p className="field-note">
        Google grants read-only Gmail access to the account. Each edition can read up to eight
        recent messages from the 24 hours before collection starts, across Gmail or from your chosen
        label. Spam, Trash and attachments are excluded. Calendar uses today’s primary calendar.
        Email subjects, senders and calendar events are listed directly, without AI rewriting. Email
        and calendar information is never sent to the AI service.
      </p>
      {error ? (
        <p role="alert">Connection status could not be loaded.</p>
      ) : !data ? (
        <p>Checking Google connection…</p>
      ) : !enabled || !data.configured ? (
        <p className="connection-status">
          Google setup is pending. Your existing newspaper still works. The connection buttons
          become available after the Auth0 and Google configuration is complete.
        </p>
      ) : (
        <>
          <p className="connection-status">
            {data.connected ? "Connected · daily access enabled" : "Daily access not enabled"}
          </p>
          {result === "linked" && (
            <p>
              Google consent is saved. Enable daily access to let your publisher read it while your
              browser is closed.
            </p>
          )}
          {result === "ready" && (
            <p>Daily access is ready. Choose the email source for your next edition.</p>
          )}
          {result === "failed" && (
            <p role="alert">
              {failureDetail[stage ?? ""] ??
                "Authorization was not completed. Check the Auth0 setup and try again."}
            </p>
          )}
          {result === "account-mismatch" && (
            <p role="alert">Use the same News4You login when enabling daily access.</p>
          )}
          <div className="connection-actions">
            <Button variant="outline" onClick={connect} disabled={connecting}>
              {connecting
                ? "Connecting…"
                : data.connected
                  ? "Renew Google consent"
                  : "1. Connect Google"}
            </Button>
            <Button onClick={dailyAccess} disabled={authorizing}>
              {authorizing
                ? "Opening Auth0…"
                : data.connected
                  ? "Renew daily access"
                  : "2. Enable daily access"}
            </Button>
          </div>
          {needsConsent && (
            <div>
              <p>
                {needsReauthentication
                  ? "Auth0 requires a fresh sign-in before connecting Google. Sign in again to continue."
                  : "Auth0 needs your approval before News4You can connect an external account."}
              </p>
              <Button onClick={approveAccountAccess} disabled={connecting}>
                {needsReauthentication
                  ? "Sign in again to connect Google"
                  : "Approve Auth0 connection permissions"}
              </Button>
            </div>
          )}
          {data.connected && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={calendar}
                  onChange={(e) => setCalendar(e.target.checked)}
                />
                Include today’s primary calendar
              </label>
              <label htmlFor="gmail-mode">Emails for this newspaper</label>
              <select
                id="gmail-mode"
                value={emailMode}
                onChange={(event) => setEmailMode(event.target.value as GoogleChoices["emailMode"])}
              >
                <option value="none">No email</option>
                <option value="all">All recent mail</option>
                <option value="label">A label I choose</option>
              </select>
              {emailMode === "label" && (
                <>
                  <label htmlFor="gmail-label">Gmail label for this newspaper</label>
                  <select
                    id="gmail-label"
                    value={labelId}
                    onChange={(e) => setLabelId(e.target.value)}
                    disabled={!labels}
                  >
                    <option value="">No email selected</option>
                    {labels?.map((l) => (
                      <option value={l.id} key={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {labelError && (
                    <p role="alert">
                      Labels could not be read. Renew Google consent and check Gmail API access.
                    </p>
                  )}
                  <p className="field-note">
                    Choose a custom label you created in Gmail. Changing this selection affects
                    future editions.
                  </p>
                </>
              )}
              {emailMode === "all" && (
                <p className="field-note">
                  Reads up to eight recent messages across Gmail from the 24 hours before collection
                  starts, including archived mail. Spam, Trash and attachments are excluded. Only
                  subjects, senders and received times are listed. Message bodies are not collected
                  or sent to AI.
                </p>
              )}
              <div className="connection-actions">
                <Button
                  disabled={saving || (emailMode === "label" && !labelId)}
                  onClick={async () => {
                    setMessage("");
                    try {
                      await save({
                        calendar,
                        emailMode,
                        labelId: emailMode === "label" ? labelId || null : null,
                      }).unwrap();
                      setMessage("Google choices saved for your next edition.");
                    } catch {
                      setMessage("Google choices could not be saved.");
                    }
                  }}
                >
                  {saving ? "Saving…" : "Save Google choices"}
                </Button>
                <Button
                  variant="outline"
                  disabled={disconnecting}
                  onClick={async () => {
                    try {
                      await disconnect().unwrap();
                      setMessage(
                        "Disconnected. Future editions will not collect Google content. Saved editions remain in your history.",
                      );
                    } catch {
                      setMessage("Could not disconnect. Try again.");
                    }
                  }}
                >
                  Disconnect
                </Button>
              </div>
              <p className="field-note">
                {data.lastSyncedAt
                  ? `Last collected: ${new Date(data.lastSyncedAt).toLocaleString()}`
                  : "Google content will be collected when your next edition is published."}
              </p>
            </>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
