import { Button } from "../../../components/ui/button";
import type { Source } from "@news4you/shared";

export function SourceSettings({
  sources,
  onChange,
}: {
  sources: Source[];
  onChange: (sources: Source[]) => void;
}) {
  function update(id: string, change: Partial<Source>) {
    onChange(sources.map((source) => (source.id === id ? { ...source, ...change } : source)));
  }
  return (
    <section aria-labelledby="sources-heading">
      <h2 id="sources-heading">Choose your sources</h2>
      <p className="field-note">
        Add up to 10 RSS or Atom feeds using public HTTPS URLs. Your choices shape future editions.
        An unavailable feed is skipped when other sources are available.
      </p>
      {sources.map((source) => (
        <fieldset className="source-setting" key={source.id}>
          <legend>{source.name || "New feed"}</legend>
          <label htmlFor={"source-name-" + source.id}>Feed name</label>
          <input
            id={"source-name-" + source.id}
            value={source.name}
            required
            maxLength={80}
            onChange={(event) => update(source.id, { name: event.target.value })}
          />
          <label htmlFor={"source-url-" + source.id}>RSS or Atom URL</label>
          <input
            id={"source-url-" + source.id}
            type="url"
            value={source.url}
            required
            placeholder="https://example.com/feed.xml"
            onChange={(event) => update(source.id, { url: event.target.value })}
          />
          <div className="source-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={source.enabled}
                onChange={(event) => update(source.id, { enabled: event.target.checked })}
              />
              Include this feed
            </label>
            <Button
              type="button"
              variant="outline"
              aria-label={"Remove " + (source.name || "new feed")}
              onClick={() => onChange(sources.filter((item) => item.id !== source.id))}
            >
              Remove feed
            </Button>
          </div>
        </fieldset>
      ))}
      {!sources.length && (
        <p>No news feeds selected. Your connected personal sources and weather can still appear.</p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={sources.length >= 10}
        onClick={() =>
          onChange([
            ...sources,
            {
              id: crypto.randomUUID(),
              name: "",
              url: "",
              enabled: true,
            },
          ])
        }
      >
        Add feed
      </Button>
      <p className="field-note">
        Save preferences to keep your feed changes. Feed contents are checked when the next edition
        is generated.
      </p>
    </section>
  );
}
