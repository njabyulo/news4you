export interface ScheduleEnv {
  API_URL: string;
  API: Fetcher;
  PUBLISHER_TOKEN: string;
  PUBLICATION: Workflow<{ runId: string }>;
}

export async function schedulePublications(env: ScheduleEnv) {
  const request = async (path: string) => {
    const response = await env.API.fetch(new URL(path, env.API_URL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PUBLISHER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) throw new Error("Publisher scheduling failed");
    return response.json() as Promise<{ runs: { id: string }[] }>;
  };
  await request("/internal/schedule");
  const { runs } = await request("/internal/dispatchable");
  if (runs.length)
    await env.PUBLICATION.createBatch(
      runs.map((run) => ({ id: `${run.id}-${crypto.randomUUID()}`, params: { runId: run.id } })),
    );
}
