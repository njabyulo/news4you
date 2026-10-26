# Live edition generation

The publisher streams model text, parses partial edition JSON and sends bounded draft checkpoints to the API. Today displays the latest headline, introduction and stories as a provisional newspaper. A draft is never an edition: local schema/reference validation and the API’s publication validation must both succeed before the saved edition replaces it.

## Flow

1. The authenticated reader requests a generation run. The page shows that it is waiting for the publisher until a lease is claimed.
2. `PublicationService` reports collecting, writing, validating and saving stages. It associates draft text with selected-source metadata; raw collected email/calendar input is not copied into progress snapshots.
3. `MastraEditionEditor` consumes `Agent.stream().textStream`. `parseDraft` accepts partial strings, arrays and objects, then permits only the shared draft schema. The publisher checkpoints at most once every 750ms while writing, plus stage transitions and the final model-reported usage.
4. Internal progress updates require the publisher secret, the current unexpired lease and a strictly increasing sequence. A new claim clears the previous attempt’s snapshot. Failed runs keep their provisional draft, require an explicit retry and clear it when retried. Interrupted leases retain the existing bounded recovery behavior.
5. The dashboard uses authenticated `fetch` SSE, with the bearer token in a header. The API checks reader ownership and returns `Cache-Control: no-store`. Connections last up to 25 seconds, checking for changes every second and emitting heartbeats every five seconds. Reconnection supplies the latest stored snapshot and obtains a fresh access token. Closing the page cancels its stream, not the generation job. The ordinary Today query remains a fallback.
6. Success refetches Today and renders the saved edition. Failure retains the visibly unsaved draft and offers Retry. React renders text as text; partial JSON and model reasoning are never displayed. Source links resolve only against supplied source IDs. Reported input/output token counts appear in optional generation details after the model finishes; no live token estimate or percentage is invented.

Progress adds one nullable column to `generation_runs` in migration `0005_generation_progress.sql`. Clearing a generation run also clears its draft. Progress uses the existing D1 database and standard Worker routes; no additional hosted service or paid model is introduced. Hosted Gemma receives public news/weather only. Personal snapshots bypass the AI editor.

## Local publisher for testing

The production publisher runs in Cloudflare Workflows. The API creates an instance when a reader requests generation, then returns HTTP 202. Its workflow binding points to the `news4you-publisher` Worker. A service binding lets the publisher claim exactly that run and save progress/results through the authenticated API.

An hourly Cloudflare Cron Trigger (minute 7) enqueues due editions and starts workflows for up to 25 pending or recoverable runs. Each instance has one six-minute step, zero step retries and at most one 90-second public Gemma call. D1 leases fence competing instances. Expired leases are recovered on a later hosted check, up to three attempts. Model failures require explicit retry. Provider quota failures never select a paid model.

No local watcher, Ollama server, open browser, GitHub Actions publication job or powered-on Mac is needed. The old detached watcher has been stopped and its source command removed. The optional Node CLI remains a development utility only.

Emails from the preceding 24 hours are fetched as metadata (subject, sender, received time), with no bodies or attachments. Calendar events for the edition date and email metadata are stored as separate snapshots. Neither kind can enter the editor or its draft references. Migration `0006_email_snapshots.sql` stores the email snapshot alongside the existing calendar snapshot.
