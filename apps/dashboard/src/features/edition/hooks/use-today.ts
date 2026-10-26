import { api } from "../api";
import { useState } from "react";

export function useToday() {
  const { data, error, isLoading, refetch } = api.useTodayQuery(undefined, {
    pollingInterval: 10000,
    skipPollingIfUnfocused: true,
  });
  const [generate, { isLoading: starting }] = api.useGenerateMutation();
  const [message, setMessage] = useState("");
  const generating = data?.state === "generating";
  async function start() {
    setMessage("");
    try {
      const r = await generate({ kind: "daily" }).unwrap();
      if (r.dispatch === "awaiting-hourly-publisher")
        setMessage("Your request is saved. Waiting for the publisher to pick it up.");
    } catch {
      setMessage("Could not request your edition. Please try again.");
    }
  }
  return { data, error, isLoading, refetch, starting, message, generating, start };
}
