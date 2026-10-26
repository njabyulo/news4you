import { SignIn } from "../../features/auth/components/SignIn";
import { Demo } from "../../features/edition/components/DemoPage";
import { Brand } from "../Brand";
import { Button } from "../ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import { Newspaper, BookOpen, Settings2, LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function Shell({ demo = false }: { demo?: boolean }) {
  const auth = useAuth0();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            {demo ? (
              <>
                <NavLink to="/demo" end>
                  Today’s edition
                </NavLink>
                <span className="demo-label">THE DEMO</span>
              </>
            ) : (
              <>
                <NavLink to="/today">
                  <Newspaper size={15} />
                  Today
                </NavLink>
                <NavLink to="/history">
                  <BookOpen size={15} />
                  Your editions
                </NavLink>
                <NavLink to="/settings">
                  <Settings2 size={15} />
                  Settings
                </NavLink>
              </>
            )}
          </nav>
          <div className="header-action">
            {demo ? (
              <SignIn />
            ) : (
              <Button
                variant="ghost"
                aria-label="Sign out"
                onClick={() =>
                  auth.logout({
                    logoutParams: { returnTo: window.location.origin },
                  })
                }
              >
                <LogOut size={17} />
              </Button>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {demo ? <Demo /> : <Outlet />}
      </main>
      <footer>
        <Brand />
        <span>A little less noise. A little more perspective.</span>
        <a href="/explained">How it works ↗</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </>
  );
}
