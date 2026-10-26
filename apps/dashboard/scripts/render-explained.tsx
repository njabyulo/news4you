import { ExplainedPage } from "../src/features/public/components/ExplainedPage";
import { PublicInfoPage } from "../src/features/public/components/PublicInfoPage";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";

const css = await readFile(new URL("../src/styles/explained.css", import.meta.url), "utf8");

const html =
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f6f0"><meta name="description" content="How News4You turns your interests, news and local weather into a short, source-linked daily edition. Explore the system and editorial checks."><title>How News4You works — Explained</title><style>html{scroll-behavior:smooth}body{margin:0}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}' +
  css +
  "</style></head><body>" +
  renderToStaticMarkup(<ExplainedPage />) +
  "</body></html>\n";

await mkdir(new URL("../public/", import.meta.url), { recursive: true });

await writeFile(new URL("../public/explained.html", import.meta.url), html);

console.log("Generated self-contained public/explained.html");

const policyCss = await readFile(new URL("../src/styles/public-info.css", import.meta.url), "utf8");

for (const page of ["privacy", "terms"] as const) {
  const title = page === "privacy" ? "Privacy Policy" : "Terms of Use";
  await writeFile(
    new URL(`../public/${page}.html`, import.meta.url),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — News4You</title><style>body{margin:0}*{box-sizing:border-box}${policyCss}</style></head><body>${renderToStaticMarkup(<PublicInfoPage page={page} />)}</body></html>`,
  );
}
