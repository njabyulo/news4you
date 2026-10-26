import { subscribeToRun } from "../stream";
import type { GenerationRun } from "@news4you/shared";
import { useEffect, useState } from "react";

export function useRunProgress(run: GenerationRun | undefined, refetch: () => unknown) {
  const [snapshot, setSnapshot] = useState<GenerationRun>();
  const [reconnecting, setReconnecting] = useState(false);
  const active = run?.status === "running" || run?.status === "pending";
  const id = run?.id;
  useEffect(() => {
    if (!id || !active) return;
    const controller = new AbortController();
    let terminal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function connect() {
      while (!controller.signal.aborted && !terminal) {
        try {
          await subscribeToRun(id!, controller.signal, (next) => {
            if (controller.signal.aborted || next.id !== id) return;
            setReconnecting(false);
            setSnapshot(next);
            if (next.status === "completed" || next.status === "failed") {
              terminal = true;
              void refetch();
            }
          });
        } catch {
          if (!controller.signal.aborted) setReconnecting(true);
        }
        if (!terminal && !controller.signal.aborted)
          await new Promise<void>((resolve) => {
            const finish = () => {
              clearTimeout(timer);
              controller.signal.removeEventListener("abort", finish);
              resolve();
            };
            timer = setTimeout(finish, 1000);
            controller.signal.addEventListener("abort", finish, { once: true });
          });
      }
    }
    void connect();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, active, run?.attempts, refetch]);
  const live =
    snapshot &&
    snapshot.id === id &&
    (snapshot.attempts > (run?.attempts ?? 0) ||
      (snapshot.attempts === (run?.attempts ?? 0) &&
        (snapshot.progress?.sequence ?? 0) >= (run?.progress?.sequence ?? 0))) &&
    !(snapshot.status === "failed" && run?.status === "pending" && run.attempts === 0)
      ? snapshot
      : run;
  return { run: live, reconnecting };
}
