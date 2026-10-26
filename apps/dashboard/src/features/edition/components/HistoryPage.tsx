import { State } from "../../../components/State";
import { Button } from "../../../components/ui/button";
import { api } from "../api";
import { displayDate } from "../format";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function History() {
  const { data, error, isLoading } = api.useEditionsQuery();
  return (
    <div className="content-page">
      <p className="eyebrow">YOUR READING ROOM</p>
      <h1>Your editions</h1>
      <p className="page-description">A little perspective, worth keeping.</p>
      {isLoading ? (
        <State title="Finding your editions…" loading />
      ) : error ? (
        <State title="History couldn’t be loaded" />
      ) : data?.length ? (
        <div className="history-list">
          {data.map((e) => (
            <Link to={`/editions/${e.id}`} key={e.id}>
              <span className="eyebrow">
                {displayDate(e.localDate)} {e.kind === "preview" ? "· PREVIEW" : ""}
              </span>
              <h2>{e.content.headline}</h2>
              <span>
                {e.readingMinutes} min read <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <State
          title="Your reading story starts here."
          body="Generate your first edition and you’ll find it here."
        >
          <Button asChild>
            <Link to="/today">Go to today</Link>
          </Button>
        </State>
      )}
    </div>
  );
}
