import { Button } from "../../../components/ui/button";
import { GenerationDetails } from "./GenerationDetails";
import type { GenerationRun } from "@news4you/shared";
import { useEffect, useState } from "react";

const stages = {
  collecting: "Gathering your sources",
  writing: "Writing your edition",
  validating: "Checking facts and references",
  saving: "Saving your edition",
};

export function GenerationDraft({
  run,
  reconnecting,
  starting,
  onRetry,
}: {
  run: GenerationRun;
  reconnecting: boolean;
  starting: boolean;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = run.progress;
  const draft = progress?.draft;
  const failed = run.status === "failed";
  const elapsed = run.createdAt
    ? Math.max(0, Math.floor((now - new Date(run.createdAt).getTime()) / 1000))
    : undefined;
  return (
    <section className="generation-draft" aria-labelledby="draft-heading">
      <div className="draft-status" role="status">
        <span className="eyebrow">
          {failed ? "DRAFT · NOT SAVED" : "DRAFT · STILL BEING WRITTEN"}
        </span>
        <p>
          {failed
            ? "Generation stopped. This draft wasn’t saved."
            : run.status === "pending"
              ? "Waiting for the publisher to start…"
              : progress
                ? stages[progress.stage]
                : "Starting your editor…"}
          {!failed && elapsed !== undefined && (
            <span>
              {" "}
              · {Math.floor(elapsed / 60)}m {elapsed % 60}s elapsed
            </span>
          )}
        </p>
        {progress && (
          <p className="field-note">
            Last update{" "}
            <time dateTime={progress.updatedAt}>
              {new Date(progress.updatedAt).toLocaleTimeString()}
            </time>
          </p>
        )}
        {reconnecting && !failed && (
          <p>Reconnecting to live updates. Your latest draft is kept below.</p>
        )}
        {failed && (
          <Button onClick={onRetry} disabled={starting}>
            Try again
          </Button>
        )}
      </div>
      <h1 id="draft-heading">{draft?.headline || "Your edition is coming together."}</h1>
      {draft?.intro && <p className="edition-intro">{draft.intro}</p>}
      {!draft?.headline && (
        <p>
          Stories will appear here as your editor writes. You can leave this page and return to the
          latest draft.
        </p>
      )}
      {draft?.sections?.map((section, index) => (
        <section className="story-section" key={index}>
          {section.title && (
            <div className="section-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              <span className="section-rule" />
            </div>
          )}
          {section.stories?.map((story, position) => (
            <article className="story" key={position}>
              {story.title && <h3>{story.title}</h3>}
              {story.body?.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <div className="story-sources">
                {story.sourceIds?.map((id) => {
                  const source = progress?.references.find((reference) => reference.id === id);
                  return source ? (
                    <a href={source.url} target="_blank" rel="noreferrer" key={id}>
                      {source.title}
                    </a>
                  ) : null;
                })}
              </div>
            </article>
          ))}
        </section>
      ))}
      <GenerationDetails usage={progress?.usage} />
      <p className="field-note">
        Draft text and citations are provisional. The finished edition appears after validation
        succeeds.
      </p>
    </section>
  );
}
