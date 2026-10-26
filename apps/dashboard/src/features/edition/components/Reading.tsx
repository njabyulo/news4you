import { Button } from "../../../components/ui/button";
import { api as preferencesApi } from "../../preferences/api";
import { api } from "../api";
import { displayDate } from "../format";
import { defaults, type Edition } from "@news4you/shared";
import {
  ArrowUpRight,
  ArrowRight,
  Sun,
  BookOpen,
  Check,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function Reading({ edition, demo = false }: { edition: Edition; demo?: boolean }) {
  const [feedback] = api.useFeedbackMutation();
  const [rating, setRating] = useState("");
  const [error, setError] = useState("");
  const { data: preferences } = preferencesApi.usePreferencesQuery(undefined, {
    skip: demo,
  });
  async function rate(rating: "helpful" | "unhelpful") {
    try {
      await feedback({ editionId: edition.id, rating, comment: "" }).unwrap();
      setRating(rating);
    } catch {
      setError("Feedback could not be saved. Try again.");
    }
  }
  return (
    <div className="reading">
      <div className="print-actions">
        <Button variant="outline" onClick={() => window.print()}>
          Print / save as PDF
        </Button>
      </div>
      <div className="edition-meta">
        <span>
          <span className="live-dot" />
          {edition.kind === "preview" ? "PREVIEW EDITION" : "THE DAILY EDITION"}
        </span>
        <span>{displayDate(edition.localDate)}</span>
        <span>
          <Clock size={14} />
          {edition.readingMinutes} MIN READ
        </span>
      </div>
      <section className="edition-cover">
        <div>
          <p className="eyebrow">GOOD MORNING, {demo ? "CURIOUS READER" : "READER"}</p>
          <h1>{edition.content.headline}</h1>
          <p className="edition-intro">{edition.content.intro}</p>
          <div className="interest-chips">
            {(demo ? defaults.interests : (preferences?.interests ?? [])).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <aside className="weather-card">
          <Sun size={36} strokeWidth={1.2} />
          <span className="eyebrow">YOUR CORNER OF THE WORLD</span>
          <h3>{demo ? "Johannesburg" : (preferences?.weatherCity ?? "Local weather")}</h3>
          {demo ? (
            <>
              <div className="temperature">
                24°<span> / 15°</span>
              </div>
              <p>A little sunshine for your morning.</p>
              <small>Illustrative weather · sample data</small>
            </>
          ) : (
            <p>Today’s available forecast appears with its source in your edition.</p>
          )}
          <span className="weather-line" />
        </aside>
      </section>
      <div className="editor-note">
        <span className="note-icon">
          <Sparkles size={17} />
        </span>
        <p>
          <strong>A note from your editor</strong>
          {demo
            ? "This sample edition shows the shape of your morning read. Real editions use your interests and chosen sources."
            : "Selected for your interests, edited for your time. Follow the source links to explore the full story."}
        </p>
        <span className="editor-signature">Your daily perspective</span>
      </div>
      <div className="edition-body">
        <div className="stories">
          {edition.content.sections.map((s, index) => (
            <section className="story-section" key={s.title}>
              <div className="section-title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{s.title}</h2>
                <span className="section-rule" />
              </div>
              {s.stories.map((story) => (
                <article className="story" key={story.title}>
                  <h3>{story.title}</h3>
                  {story.body.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <div className="story-sources">
                    {story.sourceIds.map((id) => {
                      const r = edition.references.find((x) => x.id === id);
                      return r ? (
                        <a key={id} href={r.url} target="_blank" rel="noreferrer">
                          {r.title} <ArrowUpRight size={13} />
                        </a>
                      ) : null;
                    })}
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
        <aside className="reading-aside">
          <div className="in-edition">
            <p className="eyebrow">IN THIS EDITION</p>
            {edition.content.sections.map((s, i) => (
              <p key={s.title}>
                <span>0{i + 1}</span>
                {s.title}
              </p>
            ))}
            <div className="aside-note">
              <BookOpen size={23} />
              <h3>Your time, well spent.</h3>
              <p>
                Read a little.
                <br />
                Know a little more.
                <br />
                Get on with your day.
              </p>
            </div>
          </div>
          <div className="source-note">
            <span className="eyebrow">A CLEARER PICTURE</span>
            <p>Every story has a source. Every edition has an end.</p>
          </div>
          {edition.agenda !== undefined && (
            <section className="day-agenda" aria-labelledby="agenda-heading">
              <p className="eyebrow">YOUR DAY AT A GLANCE</p>
              <h2 id="agenda-heading">Today’s calendar</h2>
              {!edition.agenda.length && (
                <p>No events were included in this edition’s calendar snapshot.</p>
              )}
              <ul>
                {edition.agenda.map((event, i) => (
                  <li key={i}>
                    <a href={event.url} target="_blank" rel="noreferrer">
                      {event.title}
                    </a>
                    <p>{event.detail}</p>
                  </li>
                ))}
              </ul>
              <small>
                Snapshot published{" "}
                <time dateTime={edition.createdAt}>
                  {new Intl.DateTimeFormat("en-ZA", {
                    timeZone: preferences?.timezone ?? defaults.timezone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(edition.createdAt))}
                </time>{" "}
                ({preferences?.timezone ?? defaults.timezone}). All events for the edition’s day are
                included, even those earlier in the day. Check Google Calendar for later changes.
              </small>
            </section>
          )}
          {edition.emails !== undefined && (
            <section className="day-agenda email-snapshot" aria-labelledby="email-heading">
              <p className="eyebrow">FROM YOUR INBOX</p>
              <h2 id="email-heading">Recent email</h2>
              {!edition.emails.length && <p>No email messages were included in this snapshot.</p>}
              <ul>
                {edition.emails.map((email, index) => (
                  <li key={index}>
                    <a href={email.url} target="_blank" rel="noreferrer">
                      {email.title}
                    </a>
                    <p>{email.detail}</p>
                  </li>
                ))}
              </ul>
              <small>
                Subjects, senders and received times from the preceding 24 hours. Open Gmail to read
                each message. Email and calendar information is never sent to AI.
              </small>
            </section>
          )}
        </aside>
      </div>
      <section className="edition-end">
        <span className="end-mark">✳</span>
        <h2>You’re all caught up.</h2>
        <p>There’s a whole day out there. Go enjoy it.</p>
        {!demo && (
          <div className="feedback">
            <span>
              {rating ? "Thanks for helping shape your next edition." : "Was this a good read?"}
            </span>
            <Button
              aria-label="Edition was helpful"
              variant="outline"
              onClick={() => rate("helpful")}
            >
              <ThumbsUp size={16} />
              {rating === "helpful" && <Check size={14} />}
            </Button>
            <Button
              aria-label="Edition was unhelpful"
              variant="outline"
              onClick={() => rate("unhelpful")}
            >
              <ThumbsDown size={16} />
              {rating === "unhelpful" && <Check size={14} />}
            </Button>
            {error && <p role="alert">{error}</p>}
          </div>
        )}
        {demo && (
          <Button asChild>
            <Link to="/">
              A daily edition, made for you <ArrowRight size={16} />
            </Link>
          </Button>
        )}
      </section>
    </div>
  );
}
