import { sampleEdition } from "../apps/dashboard/src/features/edition/data/sample";
import { writeFile } from "node:fs/promises";

const path = process.argv[2] ?? "/tmp/news4you-sample.json";

await writeFile(path, JSON.stringify(sampleEdition, null, 2) + "\n");

console.log("Wrote fictional sample edition to", path);
