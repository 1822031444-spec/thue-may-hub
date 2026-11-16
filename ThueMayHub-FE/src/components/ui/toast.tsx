import { X } from "lucide-react";

export function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <span>{text}</span>
      <button onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}

