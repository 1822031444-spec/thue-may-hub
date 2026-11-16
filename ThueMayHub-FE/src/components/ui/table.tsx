import type { ReactNode } from "react";

export function Table({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="px-5 pb-8 text-sm text-muted">Không có dữ liệu phù hợp.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-muted">
          <tr>
            {heads.map((h) => (
              <th key={h} className="px-4 py-3 font-extrabold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line hover:bg-slate-50/50 transition">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

