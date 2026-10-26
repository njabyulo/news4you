import { State } from "../../../components/State";
import { Button } from "../../../components/ui/button";
import { useDraftValue } from "../../../hooks/useDraftValue";
import { GoogleSettings } from "../../google/components/GoogleSettings";
import { api } from "../api";
import { SourceSettings } from "./SourceSettings";
import {
  defaults,
  defaultSources,
  preferencesSchema,
  sourceListSchema,
  type Preferences,
} from "@news4you/shared";
import { Check, LoaderCircle } from "lucide-react";
import type React from "react";
import { useState } from "react";

export function Settings() {
  const { data: p, isLoading, error } = api.usePreferencesQuery();
  const { data: sources, isLoading: loadingSources, error: sourcesError } = api.useSourcesQuery();
  const [save, { isLoading: saving }] = api.useSavePreferencesMutation();
  const [saveSources, { isLoading: savingSources }] = api.useSaveSourcesMutation();
  const [form, setForm] = useDraftValue<Preferences>(p ?? defaults);
  const [interestText, setInterestText] = useDraftValue(
    (p?.interests ?? defaults.interests).join(", "),
  );
  const [sourceForm, setSourceForm] = useDraftValue(sources ?? defaultSources);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const parsed = preferencesSchema.safeParse({
      ...form,
      interests: interestText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0].message);
      return;
    }
    const parsedSources = sourceListSchema.safeParse(
      sourceForm.map((source) => ({
        ...source,
        name: source.name.trim(),
        url: source.url.trim(),
      })),
    );
    if (!parsedSources.success) {
      setMessage("Check your feeds: " + parsedSources.error.issues[0].message);
      return;
    }
    try {
      await save(parsed.data).unwrap();
      await saveSources(parsedSources.data).unwrap();
      setMessage("Your preferences are saved. They’ll shape your next edition.");
    } catch {
      setMessage("Some settings could not be saved. Please try again.");
    }
  }
  if (isLoading || loadingSources) return <State title="Loading your preferences…" loading />;
  if (error || sourcesError) return <State title="Settings couldn’t be loaded" />;
  return (
    <div className="content-page settings">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h1>A little more you.</h1>
      <p className="page-description">Your interests. Your rhythm. Your daily perspective.</p>
      <GoogleSettings />
      <form onSubmit={submit}>
        <section>
          <h2>What catches your attention?</h2>
          <label htmlFor="interests">Interests, separated by commas</label>
          <input
            id="interests"
            value={interestText}
            onChange={(e) => setInterestText(e.target.value)}
            maxLength={1200}
          />
          <p className="field-note">A few favourites help us find stories you’ll want to read.</p>
        </section>
        <section>
          <h2>Your morning rhythm</h2>
          <div className="form-grid">
            <label>
              Reading length
              <select
                value={form.readingMinutes}
                onChange={(e) => setForm({ ...form, readingMinutes: Number(e.target.value) })}
              >
                {[2, 5, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
            <label>
              Publish at
              <input
                type="time"
                value={form.deliveryTime}
                onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                required
              />
            </label>
            <label>
              Timezone
              <input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                required
                list="timezones"
              />
              <datalist id="timezones">
                <option>Africa/Johannesburg</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
                <option>Asia/Tokyo</option>
              </datalist>
            </label>
            <label>
              Weather in
              <select
                value={form.weatherCity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weatherCity: e.target.value as Preferences["weatherCity"],
                  })
                }
              >
                {["Johannesburg", "Cape Town", "Durban"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.scheduled}
              onChange={(e) => setForm({ ...form, scheduled: e.target.checked })}
            />
            Create a daily edition automatically
          </label>
          <p className="field-note">
            The hourly publisher creates your edition on its first check after your chosen time.
          </p>
        </section>
        <SourceSettings sources={sourceForm} onChange={setSourceForm} />
        <Button disabled={saving || savingSources} type="submit">
          {saving || savingSources ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Check size={16} />
          )}{" "}
          Save preferences
        </Button>
        <p role="status" className="save-message">
          {message}
        </p>
      </form>
      <div className="privacy-note">
        <strong>A note on personal data</strong>
        <p>
          Google content is collected only after you connect your account. You can disconnect in
          Settings at any time. Published editions retain their summaries and references; raw
          collected source text is kept for seven days. The public demo uses fictional personal
          data.
        </p>
      </div>
    </div>
  );
}
