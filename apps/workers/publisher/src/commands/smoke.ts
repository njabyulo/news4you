import { editionEditor } from "../adapters/ai";
import { defaults } from "@news4you/shared";

try {
  const content = await editionEditor.edit(
    [
      {
        id: "public-fixture",
        title: "Public-topic editorial test",
        kind: "rss",
        url: "https://example.com/editorial-fixture",
        publishedAt: new Date().toISOString(),
        fingerprint: "public-editorial-fixture",
        content:
          "SYNTHETIC TEST FIXTURE. A public science newsletter describes a fictional community astronomy evening. This is test data, not a real event. Keep the sample label in the summary.",
      },
    ],
    defaults,
    undefined,
    process.argv.includes("--stream")
      ? async (draft) => {
          console.log("Streamed draft checkpoint:", JSON.stringify(draft).length, "characters");
        }
      : undefined,
  );
  console.log("Controlled one-call Gemma smoke test passed:", content.headline);
} catch (error) {
  console.error(
    "Controlled model smoke test failed:",
    error instanceof Error ? error.message : "Model unavailable",
  );
  process.exitCode = 1;
}
