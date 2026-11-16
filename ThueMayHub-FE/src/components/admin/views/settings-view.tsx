import { useState } from "react";
import { KeyRound } from "lucide-react";
import type { ModalType } from "@/components/admin/modals/action-modal";
import { AuditPanel, BackupPanel, BankPanel, NetworkLockPanel, Panel, ShopPanel, TelegramPanel } from "@/components/admin/settings/panels";
import { ghostBtn } from "@/components/ui/buttons";

const TABS = [
  ["shop", "Cửa hàng & tài khoản"],
  ["bank", "Nhận chuyển khoản"],
  ["lock", "Khoá mạng"],
  ["backup", "Sao lưu"],
  ["telegram", "Telegram"],
  ["audit", "Nhật ký thao tác"],
] as const;

type Tab = (typeof TABS)[number][0];

export function SettingsView({ onAction, initialTab }: { onAction: (type: ModalType, context?: string) => void; initialTab?: string }) {
  const [tab, setTab] = useState<Tab>(TABS.some(([key]) => key === initialTab) ? (initialTab as Tab) : "shop");

  return (
    <div className="max-w-4xl space-y-6">
      <nav className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`h-10 rounded-lg px-4 text-sm font-extrabold transition ${tab === key ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-fg"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "shop" && (
        <>
          <ShopPanel />
          <Panel title="Tài khoản của tôi" hint="Đổi mật khẩu đăng nhập; các thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất.">
            <button className={ghostBtn} onClick={() => onAction("password")}>
              <KeyRound className="size-4" /> Đổi mật khẩu
            </button>
          </Panel>
        </>
      )}
      {tab === "bank" && <BankPanel />}
      {tab === "lock" && <NetworkLockPanel />}
      {tab === "backup" && <BackupPanel />}
      {tab === "telegram" && <TelegramPanel />}
      {tab === "audit" && <AuditPanel />}
    </div>
  );
}
