import { Brand } from "../../../components/Brand";
import { State } from "../../../components/State";
import { Button } from "../../../components/ui/button";
import { configured } from "../../../config/auth";
import { SignIn } from "../../auth/components/SignIn";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowUpRight, ArrowRight, Clock } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

export function Landing() {
  const auth = useAuth0();
  if (configured && auth.isLoading) return <State title="Opening your reading room…" loading />;
  if (configured && auth.isAuthenticated) return <Navigate to="/today" replace />;
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <Link to="/demo" className="text-link">
            Explore an edition <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main id="main" className="landing">
        {auth.error && (
          <p role="alert" className="auth-error">
            Sign-in failed: {auth.error.message}
          </p>
        )}
        <p className="eyebrow">
          <span className="live-dot" /> A MORE PERSONAL PERSPECTIVE
        </p>
        <h1>
          Your world.
          <br />
          <em>Thoughtfully edited.</em>
        </h1>
        <p className="landing-copy">
          The stories that matter to you, a little context, and the day ahead. One personal edition.
          Five good minutes.
        </p>
        <div className="landing-actions">
          <SignIn />
          <Button variant="outline" asChild>
            <Link to="/demo">
              Read the sample edition <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="landing-note">
          <Clock size={15} /> Your morning, at your pace. No endless scroll.
        </div>
        <section className="landing-preview">
          <span className="eyebrow">INSIDE YOUR DAILY EDITION</span>
          <div className="preview-columns">
            <article>
              <span>01 / THE WORLD</span>
              <h2>
                The big picture,
                <br />
                in a smaller read.
              </h2>
              <p>News selected around your interests, with sources one click away.</p>
            </article>
            <article>
              <span>02 / YOUR CURIOSITY</span>
              <h2>
                Something worth
                <br />
                thinking about.
              </h2>
              <p>New ideas and useful context. A little beyond the headlines.</p>
            </article>
            <article>
              <span>03 / YOUR DAY</span>
              <h2>
                A moment to
                <br />
                look ahead.
              </h2>
              <p>Local weather and a personal touch, all in one quiet place.</p>
            </article>
          </div>
        </section>
      </main>
      <footer>
        <Brand />
        <a href="/explained">How it works ↗</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <Link to="/demo">Try the demo ↗</Link>
      </footer>
    </>
  );
}
