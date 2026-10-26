export interface EditorEnvironment {
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  MODEL_FREE_TIER_CONFIRMED?: string;
}

export type EditorPolicy = { mode: "hosted"; timeoutMs: number };

export const createEditorService = (environment: () => EditorEnvironment) =>
  new EditorService(environment);

/** The hosted editor accepts public sources only, regardless of deployment. */
export class EditorService {
  constructor(private environment: () => EditorEnvironment) {}
  resolve(hasPersonalSources: boolean): EditorPolicy {
    if (hasPersonalSources) throw new Error("Personal sources must never be sent to the AI editor");
    const environment = this.environment();
    if (!environment.GOOGLE_GENERATIVE_AI_API_KEY)
      throw new Error("Gemma free-tier key is not configured");
    if (environment.MODEL_FREE_TIER_CONFIRMED !== "true")
      throw new Error("Confirm free-tier Google project before model use");
    return { mode: "hosted", timeoutMs: 90000 };
  }
}
