import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let tokenGetter: (() => Promise<string>) | undefined;

export async function getApiAccessToken() {
  if (!tokenGetter) throw new Error("Authentication required");
  return tokenGetter();
}

export function setTokenGetter(getter: (() => Promise<string>) | undefined) {
  tokenGetter = getter;
}

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
  prepareHeaders: async (h) => {
    if (tokenGetter) h.set("Authorization", `Bearer ${await tokenGetter()}`);
    return h;
  },
});

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Today", "Editions", "Preferences", "Sources", "Google"],
  endpoints: () => ({}),
});
