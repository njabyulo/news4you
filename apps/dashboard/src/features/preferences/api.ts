import { api as baseApi } from "../../lib/api";
import type { Preferences, Source } from "@news4you/shared";

export const api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    preferences: b.query<Preferences, void>({
      query: () => "/v1/preferences",
      providesTags: ["Preferences"],
    }),
    savePreferences: b.mutation<Preferences, Preferences>({
      query: (body) => ({ url: "/v1/preferences", method: "PUT", body }),
      invalidatesTags: ["Preferences", "Today"],
    }),
    sources: b.query<Source[], void>({
      query: () => "/v1/sources",
      providesTags: ["Sources"],
    }),
    saveSources: b.mutation<Source[], Source[]>({
      query: (body) => ({ url: "/v1/sources", method: "PUT", body }),
      invalidatesTags: ["Sources"],
    }),
  }),
});
