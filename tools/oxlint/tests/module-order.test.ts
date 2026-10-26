import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const cli = fileURLToPath(new URL("../../../node_modules/oxlint/bin/oxlint", import.meta.url));

const plugin = fileURLToPath(new URL("../module-order.mjs", import.meta.url));

const folders: string[] = [];

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function execute(file: string) {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const value = await import(${JSON.stringify(pathToFileURL(file).href)}); console.log(JSON.stringify(value.result));`,
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

function fix(source: string, extension = "mjs") {
  const example = fixture(source, extension),
    result = example.lint(true);
  expect(result.error).toBeUndefined();
  expect(result.stdout + result.stderr).not.toContain("panicked");
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(example.lint().status).toBe(0);
  return example;
}

function fixture(source: string, extension = "mjs") {
  const folder = mkdtempSync(join(tmpdir(), "news4you-order-"));
  folders.push(folder);
  const file = join(folder, `fixture.${extension}`),
    config = join(folder, "oxlint.json");
  writeFileSync(file, source);
  writeFileSync(
    config,
    JSON.stringify({
      plugins: [],
      categories: { correctness: "off" },
      jsPlugins: [{ name: "news4you", specifier: plugin }],
      rules: { "news4you/module-order": "error" },
    }),
  );
  const lint = (fix = false) =>
    spawnSync(process.execPath, [cli, "-c", config, ...(fix ? ["--fix"] : []), file], {
      encoding: "utf8",
      timeout: 15000,
    });
  return { file, folder, lint, text: () => readFileSync(file, "utf8") };
}

describe("Oxlint module-order rule", () => {
  it("reports disorder and fixes imports, types, variables and remaining declarations", () => {
    const example = fixture(
      'const zebra = 1;\ninterface Zebra {}\nimport path from "node:path";\ntype Apple = string;\nimport fs from "node:fs";\nconst apple = 2;\nclass Example {}',
      "ts",
    );
    expect(example.lint().status).toBe(1);
    expect(example.lint(true).status).toBe(0);
    const text = example.text();
    expect(text.indexOf('"node:fs"')).toBeLessThan(text.indexOf('"node:path"'));
    expect(text.indexOf('"node:path"')).toBeLessThan(text.indexOf("type Apple"));
    expect(text.indexOf("type Apple")).toBeLessThan(text.indexOf("interface Zebra"));
    expect(text.indexOf("interface Zebra")).toBeLessThan(text.indexOf("const apple"));
    expect(text.indexOf("const apple")).toBeLessThan(text.indexOf("const zebra"));
    expect(text.indexOf("const zebra")).toBeLessThan(text.indexOf("class Example"));
  });
  it("keeps eager dependencies ahead of alphabetical consumers", () => {
    const example = fix("const zebra = 4;\nconst apple = zebra + 1;\nexport const result = apple;");
    expect(example.text().indexOf("const zebra")).toBeLessThan(
      example.text().indexOf("const apple"),
    );
    expect(execute(example.file)).toBe(5);
  });
  it("preserves initialized code across calls, including hidden closure dependencies", () => {
    const example = fix(
      "const zebra = 4;\nfunction read() { return zebra; }\nconst apple = read();\nexport const result = apple;",
    );
    expect(execute(example.file)).toBe(4);
  });
  it("allows lazy factories before classes and preserves eager constructor uses", () => {
    const example = fix(
      "class Example { value = 7; }\nexport const createExample = () => new Example();\nexport const result = createExample().value;",
    );
    expect(execute(example.file)).toBe(7);
  });
  it("preserves side-effect import order", () => {
    const example = fix('import "./z.mjs";\nimport "./a.mjs";\nexport const result = 1;');
    expect(example.text().indexOf("./z.mjs")).toBeLessThan(example.text().indexOf("./a.mjs"));
  });
  it("preserves comments, a shebang and declaration documentation", () => {
    const example = fix(
      "#!/usr/bin/env node\n/* header */\nclass Zebra {}\n/** Apple docs */\nclass Apple {}\n// footer",
    );
    expect(example.text()).toMatch(/^#!\/usr\/bin\/env node\n\/\* header \*\//);
    expect(example.text()).toContain("/** Apple docs */\nclass Apple");
    expect(example.text()).toContain("// footer");
  });
  it("preserves immediately invoked function dependencies and execution order", () => {
    const example = fix(
      "const zebra = 9;\nconst apple = (() => zebra)();\nconst values = [];\nvalues.push(apple);\nvalues.push(2);\nexport const result = values;",
    );
    expect(execute(example.file)).toEqual([9, 2]);
  });
  it("is idempotent after fixing", () => {
    const example = fix("const zebra = 2;\nconst apple = 1;\nexport const result = apple + zebra;");
    const first = example.text();
    expect(example.lint(true).status).toBe(0);
    expect(example.text()).toBe(first);
  });
});

it("reports eager dependency cycles without changing the program", () => {
  const source = "const zebra = apple;\nconst apple = zebra;";
  const example = fixture(source);
  const result = example.lint(true);
  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain("cycle");
  expect(example.text()).toBe(source);
});
