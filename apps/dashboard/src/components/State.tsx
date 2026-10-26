import { Newspaper, LoaderCircle } from "lucide-react";
import type React from "react";

export function State({
  title,
  body,
  loading,
  children,
}: {
  title: string;
  body?: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="state" aria-live="polite">
      {loading ? <LoaderCircle className="spin" size={32} /> : <Newspaper size={32} />}
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}
