import { State } from "../../../components/State";
import { Button } from "../../../components/ui/button";
import { displayDate } from "../format";
import { useRunProgress } from "../hooks/use-run-progress";
import { useToday } from "../hooks/use-today";
import { GenerationDetails } from "./GenerationDetails";
import { GenerationDraft } from "./GenerationDraft";
import { Reading } from "./Reading";
import { LoaderCircle, Sparkles } from "lucide-react";

export function Today() {
  const { data, error, isLoading, refetch, starting, message, generating, start } = useToday();
  const progress = useRunProgress(data?.run, refetch);
  if (isLoading) return <State title="Opening today’s edition…" loading />;
  if (error)
    return (
      <State title="Your edition couldn’t be loaded" body="Please try again in a moment.">
        <Button onClick={refetch}>Try again</Button>
      </State>
    );
  if (data?.edition)
    return (
      <>
        <Reading edition={data.edition} />
        <GenerationDetails usage={data.run?.progress?.usage} />
      </>
    );
  if (progress.run)
    return (
      <>
        <GenerationDraft
          run={progress.run}
          reconnecting={progress.reconnecting}
          starting={starting}
          onRetry={start}
        />
        {message && <p role="status">{message}</p>}
      </>
    );
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR DAILY PERSPECTIVE</p>
        <p>{data?.localDate && displayDate(data.localDate)}</p>
      </div>
      <State
        title={
          generating
            ? "Your edition is coming together."
            : data?.state === "failed"
              ? "Let’s give your edition another try."
              : "A new day. A fresh perspective."
        }
        body={
          generating
            ? "Your editor is gathering stories and putting the finishing touches on your read. This page will update automatically."
            : data?.state === "failed"
              ? "The publisher couldn’t finish this edition. You can request another attempt."
              : "Your edition is ready to be created whenever you are."
        }
        loading={generating}
      >
        {!generating && (
          <Button onClick={start} disabled={starting}>
            {starting ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{" "}
            {data?.state === "failed" ? "Try again" : "Generate today’s edition"}
          </Button>
        )}
        {message && <p role="status">{message}</p>}
      </State>
    </>
  );
}
