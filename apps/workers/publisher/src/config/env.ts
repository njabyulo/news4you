export interface PublisherConfig {
  baseUrl: string;
  token: string;
}

export function readPublisherConfig(environment: NodeJS.ProcessEnv = process.env): PublisherConfig {
  const baseUrl = environment.API_URL;
  const token = environment.PUBLISHER_TOKEN;
  if (!baseUrl || !token) throw new Error("API_URL and PUBLISHER_TOKEN are required");
  return { baseUrl, token };
}
