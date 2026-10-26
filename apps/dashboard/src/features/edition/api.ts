import { api as baseApi } from "../../lib/api";
import type { Edition, GenerationRun } from "@news4you/shared";

export const api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    today: b.query<
      {
        state: "ready" | "missing" | "generating" | "failed";
        localDate: string;
        edition?: Edition;
        run?: GenerationRun;
      },
      void
    >({ query: () => "/v1/today", providesTags: ["Today"] }),
    editions: b.query<Edition[], void>({
      query: () => "/v1/editions",
      providesTags: ["Editions"],
    }),
    edition: b.query<Edition, string>({
      query: (id) => `/v1/editions/${encodeURIComponent(id)}`,
    }),
    generate: b.mutation<{ runId: string; dispatch: string }, { kind: "daily" | "preview" }>({
      query: (body) => ({ url: "/v1/generations", method: "POST", body }),
      invalidatesTags: ["Today", "Editions"],
    }),
    run: b.query<GenerationRun, string>({ query: (id) => `/v1/runs/${id}` }),
    feedback: b.mutation<
      { ok: boolean },
      { editionId: string; rating: "helpful" | "unhelpful"; comment: string }
    >({ query: (body) => ({ url: "/v1/feedback", method: "POST", body }) }),
  }),
});
