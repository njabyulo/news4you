// Display only the SDK's diagnostic text, never request bodies or token objects.
export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Please try again.";
  const e = error as Record<string, unknown>;
  const details = [e.error, e.title, e.error_description, e.detail];
  if (Array.isArray(e.validation_errors))
    for (const issue of e.validation_errors.slice(0, 3))
      if (issue && typeof issue === "object") details.push(issue.detail);
  let text = [...new Set(details.filter((v): v is string => typeof v === "string" && !!v))].join(
    " · ",
  );
  if (!text && error instanceof Error) text = error.message;
  return (text || "Please try again.")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted token]")
    .replace(
      /((?:access_token|refresh_token|client_secret|id_token)["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi,
      "$1[redacted]",
    )
    .slice(0, 600);
}
