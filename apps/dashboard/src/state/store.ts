import { api } from "../lib/api";
import { configureStore } from "@reduxjs/toolkit";

export { api, setTokenGetter } from "../lib/api";

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (g) => g().concat(api.middleware),
});
