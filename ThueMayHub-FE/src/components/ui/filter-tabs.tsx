/** Dãy nút lọc nhanh nằm giữa ô tìm kiếm và bảng, kèm số lượng của từng nhóm. */
export function FilterTabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (key: string) => void;
  tabs: [key: string, label: string, count: number][];
}) {
  return (
    <div className="flex flex-wrap gap-2 px-5 pb-4">
      {tabs.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          className={`h-8 rounded-full px-3 text-xs font-bold transition ${
            value === key ? "bg-primary text-primary-ink" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => onChange(key)}
        >
          {label} <span className="opacity-70">({count})</span>
        </button>
      ))}
    </div>
  );
}
