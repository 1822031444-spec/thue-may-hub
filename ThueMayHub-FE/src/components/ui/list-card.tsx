import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function ListCard({
  title,
  count,
  query,
  setQuery,
  placeholder,
  children,
  action,
}: {
  title: string;
  count: string;
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="text-base font-extrabold">{title}</h2>
          <span className="text-xs text-muted">{count}</span>
        </div>
        {action}
      </div>
      <label className="mx-5 my-4 flex h-11 max-w-md items-center gap-2 rounded-lg border border-line px-3 text-muted">
        <Search className="size-4" />
        <input
          className="w-full border-0 bg-transparent text-sm text-fg outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      {children}
    </section>
  );
}

