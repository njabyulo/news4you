import { createPublisher } from "./app";

const result = await createPublisher().run();

if (result.failed) process.exitCode = 1;
