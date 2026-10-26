// @vitest-environment jsdom
import { Reading } from "../src/features/edition/components/Reading";
import { sampleEdition } from "../src/features/edition/data/sample";
import { SourceSettings } from "../src/features/preferences/components/SourceSettings";
import { defaults, defaultSources } from "@news4you/shared";
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/edition/api", () => ({
  api: { useFeedbackMutation: () => [vi.fn()] },
}));

vi.mock("../src/features/preferences/api", () => ({
  api: { usePreferencesQuery: () => ({ data: defaults }) },
}));

let container: HTMLDivElement;

let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function click(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (item) => (item.getAttribute("aria-label") ?? item.textContent) === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

function Feeds() {
  const [sources, setSources] = useState(defaultSources);
  return <SourceSettings sources={sources} onChange={setSources} />;
}

async function render(node: ReactNode) {
  await act(async () => root.render(<MemoryRouter>{node}</MemoryRouter>));
}

describe("reader feed controls", () => {
  it("adds named editable feeds and allows removing all feeds", async () => {
    await render(<Feeds />);
    await click("Add feed");
    const fieldsets = container.querySelectorAll("fieldset");
    expect(fieldsets).toHaveLength(4);
    const input = fieldsets[3].querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "My newsletter",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(fieldsets[3].querySelector("legend")?.textContent).toBe("My newsletter");
    await click("Remove My newsletter");
    for (const source of defaultSources) await click("Remove " + source.name);
    expect(container.querySelectorAll("fieldset")).toHaveLength(0);
    expect(container.textContent).toContain("No news feeds selected");
  });
  it("caps the feed editor at ten entries", async () => {
    await render(<Feeds />);
    for (let index = 0; index < 7; index++) await click("Add feed");
    const add = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Add feed",
    );
    expect(add?.disabled).toBe(true);
    expect(container.querySelectorAll("fieldset")).toHaveLength(10);
  });
});

describe("edition calendar placement", () => {
  it("places every saved calendar event below the source note with a timestamp", async () => {
    await render(<Reading edition={sampleEdition} demo />);
    const aside = container.querySelector(".reading-aside")!;
    const sourceNote = aside.querySelector(".source-note")!;
    const agenda = aside.querySelector(".day-agenda")!;
    expect(sourceNote.nextElementSibling).toBe(agenda);
    expect(agenda.querySelectorAll("li")).toHaveLength(sampleEdition.agenda!.length);
    expect(agenda.querySelector("time")?.dateTime).toBe(sampleEdition.createdAt);
    expect(agenda.textContent).toContain("Sample · Design review");
    expect(agenda.textContent).toContain("Sample · Lunch break");
    expect(container.querySelectorAll(".day-agenda")).toHaveLength(1);
  });
  it("distinguishes an empty snapshot from an edition without a saved snapshot", async () => {
    await render(<Reading edition={{ ...sampleEdition, agenda: [] }} demo />);
    expect(container.querySelector(".day-agenda")?.textContent).toContain(
      "No events were included",
    );
    await render(<Reading edition={{ ...sampleEdition, agenda: undefined }} demo />);
    expect(container.querySelector(".day-agenda")).toBeNull();
  });
});

describe("direct email snapshots", () => {
  it("renders saved subject and sender metadata below the calendar, with no AI rewrite", async () => {
    const emails = [
      {
        title: "Your delivery update",
        detail: "From: sender@example.com. Received: 2026-10-25T07:00:00Z.",
        url: "https://mail.google.com/mail/u/0/#all/example",
      },
    ];
    await render(<Reading edition={{ ...sampleEdition, emails }} demo />);
    const snapshot = container.querySelector(".email-snapshot")!;
    expect(snapshot.textContent).toContain(emails[0].title);
    expect(snapshot.textContent).toContain(emails[0].detail);
    expect(snapshot.textContent).toContain("never sent to AI");
    expect(snapshot.previousElementSibling?.classList.contains("day-agenda")).toBe(true);
    expect(snapshot.querySelector("a")?.getAttribute("href")).toBe(emails[0].url);
  });
});
