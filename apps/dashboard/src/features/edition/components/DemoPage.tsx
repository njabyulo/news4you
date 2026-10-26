import { sampleEdition } from "../data/sample";
import { Reading } from "./Reading";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Demo() {
  return (
    <>
      <div className="demo-banner">
        <Sparkles size={14} />
        <span>
          A little taste of your daily edition. All stories and personal details are sample content.
        </span>
        <Link to="/">
          Make it your own <ArrowRight size={14} />
        </Link>
      </div>
      <Reading edition={sampleEdition} demo />
    </>
  );
}
