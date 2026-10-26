export function PublicInfoPage({ page }: { page: "privacy" | "terms" }) {
  return (
    <div className="public-info">
      <header>
        <a className="policy-brand" href="/">
          news4you.
        </a>
        <a href="/demo">Read the demo ↗</a>
      </header>
      <main>
        <p className="policy-eyebrow">NEWS4YOU · UPDATED 25 OCTOBER 2026</p>
        {page === "privacy" ? (
          <>
            <h1>Your data, explained.</h1>
            <p className="policy-lede">
              News4You makes a short daily newspaper from your interests, public news and local
              weather. Connecting a Google account is optional.
            </p>
            <h2>Who operates News4You</h2>
            <p>
              News4You is a hackathon project operated by Njabulo Majozi. Questions and
              data-deletion requests can be sent to{" "}
              <a href="mailto:admin@njabulomajozi.com">admin@njabulomajozi.com</a>.
            </p>
            <h2>Hackathon context</h2>
            <p>
              News4You is being developed for DEV Community’s{" "}
              <a href="https://dev.to/challenges/hacktoberfest-week3-2026-10-19">
                Hacktoberfest Open-Source AI Challenge: Week 3
              </a>
              . Public demonstrations use fictional personal examples.
            </p>
            <h2>What we collect and why</h2>
            <p>
              Auth0 handles sign-in. We store your account identifier, preferences, source choices,
              edition history, feedback and publication status so you can configure and read your
              paper.
            </p>
            <p>
              If you connect Google, the integration requests read-only Gmail and Calendar
              permissions. It reads the primary calendar’s events for the edition date and up to
              eight emails from the 24 hours before collection starts. You can choose all recent
              mail across Gmail, a custom label, or no email collection. Gmail’s permission covers
              the mailbox; News4You enforces the mode you save. Existing label selections stay
              limited to that label until you change them. Spam, Trash and attachments are skipped.
              We do not send mail, mark messages read, or change calendar events.
            </p>
            <h2>AI and your personal information</h2>
            <p>
              The hosted free Gemma editor is used for public-source content. Email and calendar
              information is never sent to the AI editor. Email subjects, senders and received
              times, and calendar events, are displayed directly as snapshots without AI rewriting.
              Email bodies and attachments are not collected. The public demo uses fictional
              personal information.
            </p>
            <p>
              We do not sell Google user data, use it for advertising, or use it to train
              general-purpose AI models. News4You’s use and transfer of information received from
              Google APIs must adhere to the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy">
                Google API Services User Data Policy
              </a>
              , including its Limited Use requirements.
            </p>
            <h2>Services involved</h2>
            <p>
              Auth0 stores and refreshes Google provider tokens in Token Vault. The API stores an
              encrypted Auth0 refresh token for background access. Cloudflare Workers and D1 handle
              application requests and stored editions. Cloudflare Workflows runs publication jobs,
              and Cloudflare Cron Triggers schedule editions. Google hosts the public-news Gemma
              API; it receives public news and weather only. Publication does not run on the
              operator’s computer. Each service processes the information needed for its role.
            </p>
            <h2>Retention and deletion</h2>
            <p>
              Collected raw source text is retained for seven days. Saved editions, calendar
              snapshots, references and preferences remain until deleted. Disconnecting Google stops
              future collection, removes the local connection and collected personal source records,
              and attempts to revoke the Auth0 refresh token. It does not remove personal snapshots
              already saved in edition history.
            </p>
            <p>
              To request deletion of your News4You account data and saved editions, email the
              contact above from the account you use for News4You. We may ask you to verify account
              ownership. You can also revoke the Google grant in your Google Account’s third-party
              connections settings.
            </p>
            <h2>Your choices</h2>
            <p>
              You can use public news without connecting Google, change the selected label, turn
              calendar collection off, disable scheduled publication, or disconnect Google in
              Settings. Only signed-in account owners can access their private edition records.
              Operational errors may be logged to diagnose failures; mailbox and calendar text is
              not intentionally logged.
            </p>
            <h2>Availability of Google connections</h2>
            <p>
              Google account access is still undergoing setup and verification. The public demo is
              available without a Google connection. This policy will be updated before material
              changes to how personal content is processed.
            </p>
          </>
        ) : (
          <>
            <h1>A few terms for your daily paper.</h1>
            <p className="policy-lede">
              News4You is an experimental hackathon project operated by Njabulo Majozi. Contact{" "}
              <a href="mailto:admin@njabulomajozi.com">admin@njabulomajozi.com</a> with questions.
            </p>
            <h2>Using the service</h2>
            <p>
              Use your own account and connect only accounts you are authorized to access. Do not
              misuse the service, interfere with other readers, or attempt to obtain another
              reader’s data. Google connections remain subject to Google’s approval and your account
              administrator’s policies.
            </p>
            <h2>An edition is a snapshot</h2>
            <p>
              Stories may be shortened or generated by AI and may contain errors. Follow the
              original sources before acting on information. Meetings and delivery statuses can
              change after publication; check the original calendar or message for updates. News4You
              is not a guaranteed reminder, delivery tracker or emergency service.
            </p>
            <h2>Experimental availability</h2>
            <p>
              Features can change or become unavailable because of development, provider quotas or
              external verification requirements. Automatic printing is not currently supported. The
              browser print view can be used to print or save a PDF yourself.
            </p>
            <h2>Content and privacy</h2>
            <p>
              You retain your rights in the personal content you connect. News4You processes
              authorized content to provide your editions as described in the{" "}
              <a href="/privacy">Privacy Policy</a>. Original articles and newsletters remain
              subject to their authors’ rights. Source links are included so readers can consult the
              originals.
            </p>
            <h2>Ending access</h2>
            <p>
              You can disconnect Google and disable scheduled editions in Settings. For account-data
              deletion, contact the email above. We may restrict access that abuses the service or
              puts other readers’ data at risk.
            </p>
          </>
        )}
      </main>
      <footer>
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/explained">How it works</a>
      </footer>
    </div>
  );
}
