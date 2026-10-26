import { useState } from "react";

/** Follow saved data until the first edit; refetches must not overwrite a draft. */
export function useDraftValue<T>(savedValue: T): [T, (value: T) => void] {
  const [draft, setDraft] = useState<{ value: T }>();
  return [draft ? draft.value : savedValue, (value) => setDraft({ value })];
}
