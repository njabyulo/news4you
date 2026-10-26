import { api, setTokenGetter } from "../../../state/store";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDispatch } from "react-redux";

/** Mount private queries only after Auth0 can supply an API access token. */
export function SessionBoundary({
  children,
  loading,
  error,
}: {
  children: ReactNode;
  loading: ReactNode;
  error: ReactNode;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useDispatch();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    async function getToken() {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("Authentication required");
      return token;
    }
    void getToken()
      .then(() => {
        if (!active) return;
        setTokenGetter(getToken);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
      setTokenGetter(undefined);
      dispatch(api.util.resetApiState());
    };
  }, [getAccessTokenSilently, dispatch]);
  return status === "ready" ? children : status === "error" ? error : loading;
}
