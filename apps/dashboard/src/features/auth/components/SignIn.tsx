import { Button } from "../../../components/ui/button";
import { configured } from "../../../config/auth";
import { useAuth0 } from "@auth0/auth0-react";
import { ArrowUpRight } from "lucide-react";
import { useLocation } from "react-router-dom";

export function SignIn() {
  const auth = useAuth0();
  const location = useLocation();
  const requested = location.state?.returnTo;
  const returnTo =
    typeof requested === "string" &&
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.includes("\\")
      ? requested
      : "/today";
  return (
    <Button
      onClick={() => (configured ? auth.loginWithRedirect({ appState: { returnTo } }) : undefined)}
      disabled={!configured}
    >
      {configured ? "Make it yours" : "Sign-in setup pending"} <ArrowUpRight size={15} />
    </Button>
  );
}
