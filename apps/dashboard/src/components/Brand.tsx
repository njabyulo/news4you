import { Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="News4You home">
      <span className="brand-icon">
        <Newspaper size={20} />
      </span>
      news<span className="brand-four">4</span>you
      <span className="brand-dot">.</span>
    </Link>
  );
}
