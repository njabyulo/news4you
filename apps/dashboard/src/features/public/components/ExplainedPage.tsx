import { Newspaper } from "lucide-react";
import type { ReactNode } from "react";

function Architecture() {
  return (
    <svg
      className="ex-diagram"
      viewBox="0 0 1280 720"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="news4you-system-title news4you-system-desc"
    >
      <title id="news4you-system-title">The News4You system</title>
      <desc id="news4you-system-desc">
        Your browser signs in with Auth0 and calls Hono, which owns D1 data and collects Google
        content for direct personal snapshots. A Cloudflare Workflow edits only public news with
        hosted Gemma and saves editions through the API.
      </desc>
      <Markers prefix="system" />
      <rect width="1280" height="720" fill="#f7f6f0" />
      <g className="ex-path" markerEnd="url(#system-link)" stroke="#254f40">
        <path d="M136 248 V168" />
        <path d="M216 168 V248" />
        <path d="M280 304 H448" />
        <path d="M448 340 H280" />
        <path d="M560 248 V168" />
        <path d="M944 280 H672" />
        <path d="M1064 248 V168" />
        <path d="M1104 360 V480" />
      </g>
      <g className="ex-path ex-path-async" markerEnd="url(#system-arrow)">
        <path d="M528 480 V360" />
        <path d="M672 328 H944" />
        <path d="M672 528 H848 Q856 528 856 520 V408 Q856 400 864 400 H1016 Q1024 400 1024 392 V360" />
      </g>
      <Label x={72} y={200} width={56}>
        SIGN IN
      </Label>
      <Label x={224} y={200} width={64}>
        TOKEN
      </Label>
      <Label x={308} y={280} width={112}>
        READ / REQUEST
      </Label>
      <Label x={308} y={316} width={112}>
        LIVE DRAFT
      </Label>
      <Label x={744} y={304} width={112}>
        START RUN
      </Label>
      <Label x={568} y={200} width={88}>
        SAVE / READ
      </Label>
      <Label x={536} y={412} width={80}>
        SCHEDULE
      </Label>
      <Label x={744} y={256} width={112}>
        CLAIM + SAVE
      </Label>
      <Label x={1072} y={200} width={112}>
        RSS + WEATHER
      </Label>
      <Label x={1112} y={412} width={48}>
        EDIT
      </Label>
      <Label x={720} y={504} width={88}>
        START DUE
      </Label>
      <Node
        x={64}
        y={72}
        width={216}
        height={96}
        tag="IDENTITY"
        title="Auth0"
        sub="Sign-in + Google Token Vault"
        kind="external"
      />
      <Node
        x={64}
        y={248}
        width={216}
        tag="BROWSER"
        title="Your reading room"
        sub="React · Redux · RTK Query"
      />
      <Node
        x={448}
        y={72}
        height={96}
        tag="DATABASE"
        title="Cloudflare D1"
        sub="Preferences, runs, editions"
        kind="store"
      />
      <Node
        x={448}
        y={248}
        tag="API · CLOUDFLARE WORKER"
        title="Hono API"
        sub="Ownership + Google collection"
        kind="focal"
      />
      <Node
        x={448}
        y={480}
        height={96}
        tag="AUTOMATIC PUBLICATION"
        title="Cloudflare Cron"
        sub="Hourly at minute 7"
        kind="external"
      />
      <Node
        x={944}
        y={72}
        width={240}
        height={96}
        tag="EXTERNAL INPUTS"
        title="RSS + local weather"
        sub="Public sources only"
        kind="external"
      />
      <Node
        x={944}
        y={248}
        width={240}
        tag="CLOUDFLARE WORKFLOW"
        title="Publisher"
        sub="Collect, rank, edit, publish"
      />
      <Node
        x={944}
        y={480}
        width={240}
        height={96}
        tag="PUBLIC NEWS ONLY"
        title="Gemma 4 + Mastra"
        sub="Hosted API · no personal data"
        kind="external"
      />
      <line x1="64" y1="624" x2="1184" y2="624" stroke="#deded4" />
      <g className="ex-svg-legend">
        <rect x="64" y="652" width="16" height="12" rx="2" fill="#fff" stroke="#596752" />
        <text x="92" y="662">
          Application service
        </text>
        <rect
          x="320"
          y="652"
          width="16"
          height="12"
          rx="2"
          fill="none"
          stroke="#596752"
          strokeDasharray="4 3"
        />
        <text x="348" y="662">
          External service
        </text>
        <rect x="576" y="652" width="16" height="12" rx="2" fill="#eeeee5" stroke="#596752" />
        <text x="604" y="662">
          Persisted data
        </text>
        <line x1="832" y1="658" x2="860" y2="658" stroke="#596752" strokeDasharray="5 4" />
        <text x="872" y="662">
          Asynchronous handoff
        </text>
      </g>
    </svg>
  );
}

function EditorialFlow() {
  return (
    <svg
      className="ex-diagram"
      viewBox="0 0 1280 720"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="news4you-editorial-title news4you-editorial-desc"
    >
      <title id="news4you-editorial-title">From sources to a published edition</title>
      <desc id="news4you-editorial-desc">
        The public-news path ranks RSS and weather, asks Gemma for a live draft and validates it.
        Optional Gmail metadata and calendar events bypass AI. Both parts are saved together only
        after the public draft passes validation; failures remain unpublished.
      </desc>
      <Markers prefix="editorial" />
      <rect width="1280" height="720" fill="#f7f6f0" />
      <g className="ex-path" markerEnd="url(#editorial-arrow)">
        <path d="M592 144 V168" />
        <path d="M592 264 V288" />
        <path d="M712 360 H896" />
        <path d="M592 432 V512" />
        <path d="M1024 432 V512" />
        <path d="M208 264 V320" />
        <path d="M208 432 V464 Q208 472 216 472 H584 a8 8 0 0 1 16 0 H848 Q856 472 856 464 V408 Q856 400 864 400 H896" />
      </g>
      <Label x={760} y={336} width={72}>
        YES
      </Label>
      <Label x={600} y={440} width={48}>
        NO
      </Label>
      <Label x={1032} y={464} width={64}>
        READ
      </Label>
      <Label x={304} y={480} width={168}>
        DIRECT SNAPSHOTS
      </Label>
      <Node
        x={64}
        y={168}
        width={288}
        height={96}
        tag="OPTIONAL · GOOGLE"
        title="Gmail + Calendar"
        sub="Read-only access with consent"
        kind="external"
      />
      <Node
        x={64}
        y={320}
        width={288}
        tag="NO AI PROCESSING"
        title="Keep original details"
        sub="Email metadata · day events"
        kind="store"
      />
      <Node
        x={448}
        y={48}
        width={288}
        height={96}
        tag="01 · COLLECT"
        title="Rank public sources"
        sub="Deduplicate · max 12 items"
      />
      <Node
        x={448}
        y={168}
        width={288}
        height={96}
        tag="02 · EDIT"
        title="Write a live draft"
        sub="Hosted Gemma 4 · one editor"
      />
      <g className="ex-decision">
        <path d="M592 288 L712 360 L592 432 L472 360 Z" />
        <text className="ex-svg-name" x="592" y="352" textAnchor="middle">
          Structure, sources
        </text>
        <text className="ex-svg-name" x="592" y="372" textAnchor="middle">
          and budget valid?
        </text>
      </g>
      <Node
        x={896}
        y={320}
        width={256}
        tag="03 · PUBLISH"
        title="Save the edition"
        sub="One D1 transaction"
        kind="focal"
      />
      <Node
        x={896}
        y={512}
        width={256}
        height={96}
        tag="04 · READ"
        title="Ready at /today"
        sub="With original source links"
      />
      <Node
        x={448}
        y={512}
        width={288}
        height={96}
        tag="STOP ON FAILURE"
        title="Keep the draft unpublished"
        sub="Explicit retry after model errors"
        kind="store"
      />
      <line x1="64" y1="644" x2="1184" y2="644" stroke="#deded4" />
      <text className="ex-svg-sub" x="64" y="680">
        Validation checks shape, attribution and length. It cannot guarantee factual accuracy.
      </text>
    </svg>
  );
}

export function ExplainedPage() {
  return (
    <div className="explained-page">
      <a className="ex-skip" href="#explained-main">
        Skip to explanation
      </a>
      <header className="ex-header">
        <Wordmark />
        <nav aria-label="Public navigation">
          <a href="/demo">
            Read the demo <span aria-hidden="true">↗</span>
          </a>
          <a href="/" className="ex-button">
            Make it yours <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="explained-main" tabIndex={-1}>
        <section className="ex-hero">
          <div className="ex-eyebrow">
            <span className="ex-dot" /> NEWS4YOU, EXPLAINED
          </div>
          <h1>
            From a world of noise
            <br />
            to <em>your daily perspective.</em>
          </h1>
          <p className="ex-deck">
            Public news, your day at a glance, and a newspaper that takes shape as you watch. Here’s
            what runs in the cloud, what reaches AI, and what stays out of the editor’s hands.
          </p>
          <div className="ex-hero-bottom">
            <span>Five good minutes. A few thoughtful steps.</span>
            <a href="#the-system">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>
        <div className="ex-contents">
          <span className="ex-eyebrow">IN THIS EXPLANATION</span>
          <a href="#the-system">01 / The system</a>
          <a href="#the-edition">02 / Your edition</a>
          <a href="#the-boundaries">03 / The boundaries</a>
        </div>
        <section className="ex-section" id="the-system">
          <div className="ex-section-heading">
            <span className="ex-section-number">01</span>
            <div>
              <p className="ex-eyebrow">A SMALL SYSTEM, WITH CLEAR RESPONSIBILITIES</p>
              <h2>Your reading room has a back room.</h2>
            </div>
          </div>
          <p className="ex-section-intro">
            The dashboard is where you choose your interests and read. The API protects your data. A
            Cloudflare Workflow gathers sources and edits the public-news section. It keeps running
            when your browser is closed or your computer is switched off.
          </p>
          <Figure
            id="system-diagram"
            number="01"
            title="The system at a glance"
            description="Generate starts a hosted workflow. Cron starts scheduled work. Progress returns to your browser, and all database access goes through Hono."
          >
            <Architecture />
          </Figure>
          <div className="ex-system-notes">
            <article>
              <span className="ex-eyebrow">THE READING ROOM</span>
              <h3>Personal, after sign-in.</h3>
              <p>
                React, Vite and RTK Query power today’s edition, history and settings. Auth0
                supplies access tokens; Hono verifies the issuer and audience, then checks who owns
                each private resource.
              </p>
            </article>
            <article>
              <span className="ex-eyebrow">THE BACK ROOM</span>
              <h3>Work happens in the background.</h3>
              <p>
                Generate saves a run and starts a durable Cloudflare Workflow. The publisher claims
                that run through the internal API, collects sources, calls the public-news editor
                and saves the result. An hourly Cron Trigger starts due editions automatically.
              </p>
            </article>
          </div>
          <aside className="ex-status">
            <span className="ex-status-mark" aria-hidden="true">
              ↳
            </span>
            <div>
              <strong>A note on what’s live</strong>
              <p>
                On-demand generation, hourly publishing and live draft updates are deployed on
                Cloudflare. Hosted generation has been verified with the local publisher stopped.
                You can close the page and return later to read the result.
              </p>
            </div>
          </aside>
        </section>
        <section className="ex-section" id="the-edition">
          <div className="ex-section-heading">
            <span className="ex-section-number">02</span>
            <div>
              <p className="ex-eyebrow">SELECT. EDIT. CHECK. PUBLISH.</p>
              <h2>A short read, with a little care behind it.</h2>
            </div>
          </div>
          <div className="ex-edition-intro">
            <p>
              Your interests help rank stories. Freshness matters too. Repeated source items and
              stories already covered in your published history are filtered before the editor sees
              the shortlist.
            </p>
            <p>
              Choose up to ten RSS or Atom feeds in Settings, then adjust interests, timezone,
              delivery time and reading length. Defaults are a five-minute read, Johannesburg
              weather and publication from 06:00 in Africa/Johannesburg.
            </p>
          </div>
          <Figure
            id="editorial-diagram"
            number="02"
            title="A draft is checked before it is published"
            description="Public news goes through Gemma and validation. Personal snapshots take a separate path around AI. Neither part is saved as an edition until the public draft passes its checks."
          >
            <EditorialFlow />
          </Figure>
          <ol className="ex-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Gather a small, useful shortlist.</h3>
                <p>
                  RSS feeds bring the news. Open-Meteo supplies local weather. At most 12 ranked
                  public items go to the editor, including available weather. Email metadata and
                  calendar events appear as separate direct snapshots and never enter the AI prompt.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Give one editor a clear brief.</h3>
                <p>
                  A Mastra workflow calls one hosted Gemma 4 editor for public news and weather.
                  Email metadata and calendar events bypass AI and appear directly in your edition.
                  Source text is treated as untrusted data. The editor is asked to use supplied
                  facts, keep the read concise and cite a source for every story.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Validate, then save together.</h3>
                <p>
                  Zod checks the structure. Every source ID must exist in the supplied shortlist,
                  and the edition must fit the reading budget. The API saves the edition, its
                  stories, reference snapshots and completed run in one D1 transaction.
                </p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <h3>Read as the draft comes together.</h3>
                <p>
                  Today shows the headline, introduction and stories as they arrive, clearly marked
                  as a draft. Live updates reconnect after an interruption, with polling as a
                  fallback. Only the validated result becomes a saved edition. Its date stays tied
                  to your local day, with original source links for a deeper read.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="ex-section" id="the-boundaries">
          <div className="ex-section-heading">
            <span className="ex-section-number">03</span>
            <div>
              <p className="ex-eyebrow">DESIGNED TO HAVE AN END</p>
              <h2>A few boundaries worth knowing.</h2>
            </div>
          </div>
          <div className="ex-boundaries">
            <article>
              <h3>A request is a deliberate action.</h3>
              <p>
                Opening a missing edition doesn’t generate one. You choose Generate, or enable
                scheduled publication. Repeated daily requests share one run, and each reader gets
                at most one daily edition per local date. Previews are tracked separately.
              </p>
            </article>
            <article>
              <h3>Your calendar and inbox bypass AI.</h3>
              <p>
                Connecting Google is optional and requires read-only consent through Auth0. Choose
                all recent mail, one Gmail label, or no email. The paper lists subjects, senders and
                received times for up to eight messages from the preceding 24 hours, excluding Spam
                and Trash. Calendar events cover the edition’s date in your timezone, below the “A
                clearer picture” source note. Bodies and attachments are not collected. These
                snapshots are displayed directly and never sent to Gemma. The public demo uses
                labelled fictional examples; Google’s access review remains pending.
              </p>
            </article>
            <article>
              <h3>Failures have a stopping point.</h3>
              <p>
                Each hosted workflow handles one run and makes at most one model call, with a
                90-second model timeout and a six-minute job timeout. Model or validation errors
                require an explicit retry. An interrupted publisher can be recovered after its
                eight-minute lease expires, with a ceiling of three claims. There is no automatic
                model retry or paid fallback.
              </p>
            </article>
            <article>
              <h3>Source text has a short shelf life.</h3>
              <p>
                Collected source content is kept for seven days by default and cleaned up during
                publisher scheduling. Saved editions keep their public stories, source references
                and direct personal snapshots until deleted. Disconnecting Google stops future
                collection; it does not erase snapshots already saved in history. Validation helps
                with structure and attribution; it is not a fact-checking guarantee.
              </p>
            </article>
          </div>
          <details className="ex-details">
            <summary>What will I see while it’s writing?</summary>
            <p>
              Today moves through collecting, writing, validating and saving. The draft grows as
              content arrives; it can still change or fail validation. Elapsed time and the latest
              update help you follow progress. Token totals appear only when the model reports them,
              rather than as an estimated live counter. Closing the page does not cancel the hosted
              job.
            </p>
          </details>
          <details className="ex-details">
            <summary>Can I check a run without the operator’s computer?</summary>
            <p>
              Readers can return to Today from another device. Operators can inspect run status,
              steps and errors in Cloudflare’s Workflows dashboard under news4you-publication, and
              publisher logs under the news4you-publisher Worker. No local server is required.
            </p>
          </details>
          <details className="ex-details">
            <summary>What does “publish at 06:00” mean?</summary>
            <p>
              The hosted Cloudflare Cron Trigger checks hourly, at minute 7. It creates a due
              edition on the first check after your chosen local time. This is a publication window,
              rather than an exact-minute delivery promise.
            </p>
          </details>
          <details className="ex-details">
            <summary>What keeps the free tier free?</summary>
            <p>
              The current deployment uses Cloudflare Workers Free, D1 and Workflows, plus hosted
              Gemma on a Google project with billing disabled. News4You does not use R2 storage.
              Free limits can pause or fail generation; the app does not upgrade a plan, buy credits
              or switch to a paid model. This describes News4You’s services, not other products or
              subscriptions on the operator’s accounts. See the official{}
              <a href="https://developers.cloudflare.com/workers/platform/limits/">
                Workers limits
              </a>
              ,{}
              <a href="https://developers.cloudflare.com/d1/platform/pricing/">D1 limits</a> and{}
              <a href="https://developers.cloudflare.com/workflows/reference/limits/">
                Workflows limits
              </a>
              .
            </p>
          </details>
        </section>
        <section className="ex-end">
          <span className="ex-end-mark" aria-hidden="true">
            ✳
          </span>
          <h2>
            A little less mystery.
            <br />A little more perspective.
          </h2>
          <p>See what the finished edition feels like.</p>
          <a href="/demo" className="ex-button">
            Read the sample edition <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className="ex-footer">
        <Wordmark />
        <span>Your world. Thoughtfully edited.</span>
        <a href="#explained-main">Back to the beginning ↑</a>
      </footer>
    </div>
  );
}

function Figure({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <figure className="ex-figure" id={id}>
      <figcaption>
        <span className="ex-eyebrow">FIGURE {number}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </figcaption>
      <div
        className="ex-diagram-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${title}. Scroll horizontally to explore the full diagram.`}
      >
        {children}
      </div>
      <p className="ex-scroll-note">
        On a small screen, scroll the diagram horizontally. The explanation below follows the same
        order.
      </p>
    </figure>
  );
}

function Label({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
}) {
  return (
    <g className="ex-arrow-label">
      <rect x={x} y={y} width={width} height="16" fill="#f7f6f0" />
      <text x={x + width / 2} y={y + 11} textAnchor="middle">
        {children}
      </text>
    </g>
  );
}

function Markers({ prefix }: { prefix: string }) {
  return (
    <defs>
      <marker
        id={`${prefix}-arrow`}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0 1 L7 4 L0 7" fill="none" stroke="#596752" strokeWidth="1.2" />
      </marker>
      <marker
        id={`${prefix}-link`}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
      >
        <path d="M0 1 L7 4 L0 7" fill="none" stroke="#254f40" strokeWidth="1.2" />
      </marker>
    </defs>
  );
}

function Node({
  x,
  y,
  width = 224,
  height = 112,
  tag,
  title,
  sub,
  kind = "service",
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  tag: string;
  title: string;
  sub: string;
  kind?: "service" | "external" | "store" | "focal";
}) {
  return (
    <g className={`ex-node ex-node-${kind}`}>
      <rect x={x} y={y} width={width} height={height} rx="6" />
      <text className="ex-svg-tag" x={x + 20} y={y + 28}>
        {tag}
      </text>
      <text className="ex-svg-name" x={x + 20} y={y + 56}>
        {title}
      </text>
      <text className="ex-svg-sub" x={x + 20} y={y + 80}>
        {sub}
      </text>
    </g>
  );
}

function Wordmark() {
  return (
    <a className="ex-brand" href="/" aria-label="News4You home">
      <span className="ex-brand-symbol" aria-hidden="true">
        <Newspaper size={20} aria-hidden="true" />
      </span>
      news<span>4</span>you<span>.</span>
    </a>
  );
}
