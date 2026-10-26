import { localDate } from "@news4you/core/newspaper/util";
import type { Edition } from "@news4you/shared";

const date = localDate(new Date(), "Africa/Johannesburg");

export const sampleEdition: Edition = {
  id: "demo-edition",
  localDate: date,
  kind: "daily",
  createdAt: new Date(date + "T04:00:00Z").toISOString(),
  readingMinutes: 5,
  agenda: [
    {
      title: "Sample · Design review",
      detail:
        "10:00–10:45 · Africa/Johannesburg. Bring the revised layouts. Fictional calendar event.",
      url: "https://news4you.njabulomajozi.com/demo",
    },
    {
      title: "Sample · Lunch break",
      detail: "12:30–13:00 · Time kept clear. Fictional calendar event.",
      url: "https://news4you.njabulomajozi.com/demo",
    },
  ],
  content: {
    headline: "Your day, with a little perspective.",
    intro:
      "Two things on the calendar, a delivery update and a newsletter worth a moment. A fictional preview of a paper built around your day.",
    sections: [
      {
        title: "Your day",
        stories: [
          {
            title: "Sample · A delivery to watch for",
            body: "Fictional delivery email · A book order is marked out for delivery today. No arrival time was supplied, so the paper leaves that open. Follow the original update for changes.",
            sourceIds: ["personal"],
          },
          {
            title: "Sample · The newsletter you saved",
            body: "Fictional newsletter · This week’s community note invites volunteers to the neighbourhood garden on Saturday. The useful detail: bring gloves and check the organiser’s note before heading out.",
            sourceIds: ["personal"],
          },
          {
            title: "A little room in your day",
            body: "Sample calendar · Design review at 10:00. A protected lunch break at 12:30.\n\nSample inbox · The community garden’s volunteer morning is this Saturday. These are fictional examples; your email and calendar are not connected.",
            sourceIds: ["personal"],
          },
        ],
      },
      {
        title: "The big picture",
        stories: [
          {
            title: "The next chapter of clean energy is being written locally",
            body: "Sample story · Across South Africa, communities are exploring what a more resilient energy future could look like. Rooftop solar, neighbourhood projects, and new ways to store power are bringing the conversation closer to home.\n\nThe idea to follow: energy transitions are as much about people and practical choices as they are about technology.",
            sourceIds: ["energy"],
          },
        ],
      },
      {
        title: "Worth your curiosity",
        stories: [
          {
            title: "A wider window on the universe",
            body: "Sample story · Space exploration gives us a useful reminder: there is always more to discover. Follow the latest missions, images, and research directly from NASA, and take a moment to look beyond your everyday orbit.",
            sourceIds: ["space"],
          },
          {
            title: "The small habits behind a more thoughtful digital life",
            body: "Sample story · Your attention is finite. Setting aside a few minutes for deliberate reading can help you build a more useful picture of the world. A daily edition is one way to make a little room for that habit.",
            sourceIds: ["tech"],
          },
        ],
      },
    ],
  },
  references: [
    {
      id: "energy",
      title: "Energy background · sample story",
      url: "https://www.csir.co.za/",
      publishedAt: new Date().toISOString(),
      fingerprint: "demo-energy",
    },
    {
      id: "space",
      title: "NASA · explore more",
      url: "https://www.nasa.gov/",
      publishedAt: new Date().toISOString(),
      fingerprint: "demo-space",
    },
    {
      id: "tech",
      title: "BBC Technology · explore more",
      url: "https://www.bbc.com/news/technology",
      publishedAt: new Date().toISOString(),
      fingerprint: "demo-tech",
    },
    {
      id: "personal",
      title: "Fictional personal data",
      url: "https://news4you.njabulomajozi.com/demo",
      publishedAt: new Date().toISOString(),
      fingerprint: "demo-personal",
    },
  ],
};
