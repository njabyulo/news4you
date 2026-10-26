import { Shell } from "../../../components/layout/Shell";
import { State } from "../../../components/State";
import { configured } from "../../../config/auth";
import { SessionBoundary } from "./SessionBoundary";
import { SignIn } from "./SignIn";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, useLocation } from "react-router-dom";

export function Protected() {
  const auth = useAuth0();
  const location = useLocation();
  if (auth.isLoading) return <State title="Opening your reading room…" loading />;
  if (!configured || !auth.isAuthenticated)
    return <Navigate to="/" replace state={{ returnTo: location.pathname + location.search }} />;
  return (
    <SessionBoundary
      key={auth.user?.sub}
      loading={<State title="Preparing your session…" loading />}
      error={
        <State
          title="Your session couldn’t be prepared"
          body="Sign in again to open your newspaper."
        >
          <SignIn />
        </State>
      }
    >
      <Shell />
    </SessionBoundary>
  );
}
