import { State } from "../../../components/State";
import { api } from "../api";
import { Reading } from "./Reading";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function EditionPage() {
  const { id = "" } = useParams();
  const { data, error, isLoading } = api.useEditionQuery(id);
  return (
    <>
      {
        <Link className="back-link" to="/history">
          <ArrowLeft size={15} /> Your editions
        </Link>
      }
      {isLoading ? (
        <State title="Opening your edition…" loading />
      ) : error ? (
        <State title="Edition not found" />
      ) : (
        data && <Reading edition={data} />
      )}
    </>
  );
}
