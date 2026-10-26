import { Button } from "../../../components/ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import { authErrorMessage } from "@news4you/core/auth/util";
import { useState } from "react";

// A redirect clears the SDK's memory cache. Obtain a fresh My Account token
// interactively before the SDK consumes its single-use connection transaction.
// This also works on localhost, where silent consent restoration is disallowed.
export function GoogleConnectionReturn({ onComplete }: { onComplete: () => void }) {
  const { getAccessTokenWithPopup, handleRedirectCallback, isLoading } = useAuth0();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function finish() {
    setBusy(true);
    setError("");
    try {
      if (!connected) {
        await getAccessTokenWithPopup({
          authorizationParams: {
            audience: `https://${import.meta.env.VITE_AUTH0_DOMAIN}/me/`,
            scope: "create:me:connected_accounts",
          },
        });
        await handleRedirectCallback();
        setConnected(true);
        // A separate user gesture opens the next popup reliably in browsers.
      } else {
        await getAccessTokenWithPopup({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            scope: "openid profile email offline_access",
          },
        });
        onComplete();
      }
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content-page settings" id="main">
      <p className="eyebrow">YOUR DAY, IN YOUR PAPER</p>
      <h1>{connected ? "Google is connected." : "Finish connecting Google."}</h1>
      <p>
        {connected
          ? "Open your settings to enable daily access and choose the Gmail label for your newspaper."
          : "Confirm your News4You sign-in to securely finish linking the Google account you approved."}
      </p>
      <Button onClick={finish} disabled={busy || isLoading}>
        {busy ? "Confirming…" : connected ? "Open settings" : "Finish secure connection"}
      </Button>
      {error && (
        <p role="alert">
          Connection could not finish: {error}. If the connection has expired, return to Settings
          and start again.
        </p>
      )}
      <p>
        <a href="/settings">Return to Settings</a>
      </p>
    </main>
  );
}
