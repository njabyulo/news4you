import { Shell } from "./components/layout/Shell";
import { State } from "./components/State";
import { Button } from "./components/ui/button";
import { configured } from "./config/auth";
import { GoogleConnectionReturn } from "./features/auth/components/GoogleConnectionReturn";
import { Protected } from "./features/auth/components/Protected";
import { EditionPage } from "./features/edition/components/EditionPage";
import { History } from "./features/edition/components/HistoryPage";
import { Today } from "./features/edition/components/TodayPage";
import { Settings } from "./features/preferences/components/SettingsPage";
import { ExplainedPage } from "./features/public/components/ExplainedPage";
import { Landing } from "./features/public/components/LandingPage";
import { PublicInfoPage } from "./features/public/components/PublicInfoPage";
import { Auth0Provider } from "@auth0/auth0-react";
import { useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

export function App() {
  const navigate = useNavigate();
  const [googleReturn] = useState(() =>
    new URLSearchParams(window.location.search).has("connect_code"),
  );
  const [finishingGoogle, setFinishingGoogle] = useState(googleReturn);
  const routes = (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/demo" element={<Shell demo />} />
      <Route path="/explained" element={<ExplainedPage />} />
      <Route path="/privacy" element={<PublicInfoPage page="privacy" />} />
      <Route path="/terms" element={<PublicInfoPage page="terms" />} />
      <Route element={<Protected />}>
        <Route path="/today" element={<Today />} />
        <Route path="/history" element={<History />} />
        <Route path="/editions/:id" element={<EditionPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route
        path="*"
        element={
          <State title="This page is a blank edition.">
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </State>
        }
      />
    </Routes>
  );
  return configured ? (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      useRefreshTokens={import.meta.env.VITE_GOOGLE_CONNECTION_ENABLED === "true"}
      useRefreshTokensFallback={import.meta.env.VITE_GOOGLE_CONNECTION_ENABLED === "true"}
      useMrrt={import.meta.env.VITE_GOOGLE_CONNECTION_ENABLED === "true"}
      skipRedirectCallback={googleReturn}
      authorizationParams={{
        redirect_uri: window.location.origin + "/today",
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope:
          import.meta.env.VITE_GOOGLE_CONNECTION_ENABLED === "true"
            ? "openid profile email offline_access"
            : "openid profile email",
      }}
      onRedirectCallback={(state) => navigate(state?.returnTo || "/today", { replace: true })}
    >
      {finishingGoogle ? (
        <GoogleConnectionReturn
          onComplete={() => {
            setFinishingGoogle(false);
            navigate("/settings?google=linked", { replace: true });
          }}
        />
      ) : (
        routes
      )}
    </Auth0Provider>
  ) : (
    routes
  );
}
