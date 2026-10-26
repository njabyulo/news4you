import type { TokenUsage } from "@news4you/shared";

export function GenerationDetails({ usage }: { usage?: TokenUsage }) {
  if (usage?.inputTokens === undefined && usage?.outputTokens === undefined) return null;
  return (
    <details className="generation-details">
      <summary>Generation details</summary>
      <p>
        Model-reported usage
        {usage.inputTokens !== undefined
          ? ` · ${usage.inputTokens.toLocaleString()} input tokens`
          : ""}
        {usage.outputTokens !== undefined
          ? ` · ${usage.outputTokens.toLocaleString()} output tokens`
          : ""}
        .
      </p>
    </details>
  );
}
