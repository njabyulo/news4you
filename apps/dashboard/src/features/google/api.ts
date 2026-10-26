import { api as baseApi } from "../../lib/api";
import type { GoogleSettings } from "@news4you/shared";

export const api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    google: b.query<
      {
        configured: boolean;
        connected: boolean;
        settings: GoogleSettings;
        lastSyncedAt: string | null;
      },
      void
    >({ query: () => "/v1/google", providesTags: ["Google"] }),
    googleAuthorize: b.mutation<{ url: string }, void>({
      query: () => ({ url: "/v1/google/authorize", method: "POST" }),
    }),
    googleLabels: b.query<{ id: string; name: string }[], void>({
      query: () => "/v1/google/labels",
      providesTags: ["Google"],
    }),
    googleSettings: b.mutation<unknown, GoogleSettings>({
      query: (body) => ({ url: "/v1/google/settings", method: "PUT", body }),
      invalidatesTags: ["Google"],
    }),
    googleDisconnect: b.mutation<unknown, void>({
      query: () => ({ url: "/v1/google/disconnect", method: "POST" }),
      invalidatesTags: ["Google"],
    }),
  }),
});
