const functionNodes = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
]);

const runtimeTypeWrappers = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSInstantiationExpression",
]);

const group = (node) =>
  node.type === "ImportDeclaration"
    ? 0
    : ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"].includes(unwrap(node).type)
      ? 1
      : unwrap(node).type === "VariableDeclaration"
        ? 2
        : 3;

const moduleOrder = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Imports, types/interfaces, variables, remaining declarations; alphabetical where initialization permits.",
    },
    fixable: "code",
    schema: [],
    messages: {
      cycle: "Eager declaration dependencies form a cycle; resolve it before module ordering.",
      order:
        "Order this module as imports, types/interfaces, variables, then remaining declarations (alphabetical within dependency-safe sections).",
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      "Program:exit"(program) {
        if (program.body.length < 2) return;
        const order = ordered(program, source);
        if (!order) {
          context.report({ node: program, messageId: "cycle" });
          return;
        }
        const chunks = program.body.map((node, position) => {
          let start = node.range[0],
            end = node.range[1];
          if (position > 0) {
            const previous = program.body[position - 1];
            const leading = source
              .getCommentsBefore(node)
              .filter(
                (comment) =>
                  comment.range[0] >= previous.range[1] &&
                  comment.loc.start.line > previous.loc.end.line,
              );
            if (leading.length) start = leading[0].range[0];
          }
          const trailing = source
            .getCommentsAfter(node)
            .find((comment) => comment.loc.start.line === node.loc.end.line);
          if (trailing) end = trailing.range[1];
          return { start, end, text: source.text.slice(start, end) };
        });
        const expected = order
          .map(
            (position, index) =>
              (index === 0
                ? ""
                : group(program.body[order[index - 1]]) === 0 && group(program.body[position]) === 0
                  ? "\n"
                  : "\n\n") + chunks[position].text,
          )
          .join("");
        if (source.text.slice(chunks[0].start, chunks.at(-1).end) === expected) return;
        context.report({
          node: program,
          messageId: "order",
          fix: (fixer) => fixer.replaceTextRange([chunks[0].start, chunks.at(-1).end], expected),
        });
      },
    };
  },
};

const unwrap = (node) =>
  node.type === "ExportNamedDeclaration" && node.declaration ? node.declaration : node;

export default { meta: { name: "news4you" }, rules: { "module-order": moduleOrder } };

function bindings(statement) {
  const node = unwrap(statement);
  if (node.type === "ImportDeclaration")
    return node.specifiers.map((specifier) => specifier.local.name);
  if (node.type === "VariableDeclaration")
    return node.declarations.flatMap((declaration) => names(declaration.id));
  return node.id ? names(node.id) : [];
}

function eagerOwner(identifier, program) {
  let node = identifier;
  while (node.parent && node.parent !== program) {
    node = node.parent;
    if (node.type.startsWith("TS") && !runtimeTypeWrappers.has(node.type)) return null;
    if (node.type === "FunctionDeclaration") return null;
    // Callback bodies may run after module initialization. Executed statements
    // are already fenced below; only direct IIFEs add eager reference edges.
    if (
      functionNodes.has(node.type) &&
      !(
        ["CallExpression", "NewExpression"].includes(node.parent?.type) &&
        node.parent.callee === node
      )
    )
      return null;
  }
  return node.parent === program ? node : null;
}

function effectful(node) {
  if (!node || typeof node !== "object") return false;
  if (
    functionNodes.has(node.type) ||
    node.type === "TSTypeAliasDeclaration" ||
    node.type === "TSInterfaceDeclaration"
  )
    return false;
  if (
    [
      "CallExpression",
      "NewExpression",
      "AwaitExpression",
      "AssignmentExpression",
      "UpdateExpression",
      "TaggedTemplateExpression",
      "MemberExpression",
      "TSEnumDeclaration",
    ].includes(node.type)
  )
    return true;
  return Object.entries(node).some(
    ([key, value]) =>
      !["parent", "loc", "range", "tokens", "comments"].includes(key) &&
      (Array.isArray(value) ? value.some(effectful) : effectful(value)),
  );
}

function names(pattern) {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "RestElement") return names(pattern.argument);
  if (pattern.type === "AssignmentPattern") return names(pattern.left);
  if (pattern.type === "ObjectPattern")
    return pattern.properties.flatMap((property) =>
      names(property.type === "RestElement" ? property.argument : property.value),
    );
  if (pattern.type === "ArrayPattern") return pattern.elements.flatMap(names);
  return [];
}

function ordered(program, source) {
  const statements = program.body;
  const edges = statements.map(() => new Set());
  const index = new Map(statements.map((node, position) => [node, position]));
  const edge = (before, after) => {
    if (before !== after) edges[before].add(after);
  };
  for (const [position, statement] of statements.entries()) {
    const declaration = unwrap(statement);
    if (declaration.type === "FunctionDeclaration") continue; // Hoisted definitions.
    const declared = new Set(bindings(statement));
    for (const variable of source.getDeclaredVariables(declaration)) {
      if (!declared.has(variable.name)) continue;
      for (const reference of variable.references) {
        const owner = eagerOwner(reference.identifier, program);
        if (index.has(owner)) edge(position, index.get(owner));
      }
    }
  }
  const runtime = statements
    .map((node, position) => ({ node, position }))
    .filter(({ node }) => ![0, 1].includes(group(node)));
  // An executed initializer/expression is a fence. Never move another runtime
  // declaration across it, even when hidden function calls obscure dependencies.
  for (const { position } of runtime.filter(({ node }) => effectful(unwrap(node)))) {
    for (const item of runtime)
      if (item.position < position) edge(item.position, position);
      else if (item.position > position) edge(position, item.position);
  }
  const imports = statements
    .map((node, position) => ({ node, position }))
    .filter(({ node }) => node.type === "ImportDeclaration");
  for (const { position } of imports.filter(({ node }) => !node.specifiers.length)) {
    for (const item of imports)
      if (item.position < position) edge(item.position, position);
      else if (item.position > position) edge(position, item.position);
  }
  const incoming = statements.map(() => 0);
  for (const targets of edges) for (const target of targets) incoming[target]++;
  const label = (position) =>
    statements[position].type === "ImportDeclaration"
      ? String(statements[position].source.value)
      : bindings(statements[position]).join(",") || String(position).padStart(8, "0");
  const compare = (left, right) =>
    group(statements[left]) - group(statements[right]) ||
    label(left).localeCompare(label(right), "en", { sensitivity: "base" }) ||
    left - right;
  const remaining = new Set(statements.map((_, position) => position));
  const result = [];
  while (remaining.size) {
    const next = [...remaining].filter((position) => incoming[position] === 0).sort(compare)[0];
    if (next === undefined) return null;
    result.push(next);
    remaining.delete(next);
    for (const target of edges[next]) incoming[target]--;
  }
  return result;
}
