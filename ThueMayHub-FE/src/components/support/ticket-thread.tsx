import { useEffect, useRef, useState } from "react";
import {
  api, dateTimeLabel, errorText, report, TICKET_CATEGORY, toTicketMessage, useHub, type Row, type Ticket, type TicketMessage,
} from "@/lib/tmh-store";
import { Badge } from "@/components/ui/badge";
import { rowBtn } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";

/**
 * Hội thoại của một yêu cầu hỗ trợ, dùng chung cho quầy và khách. Quầy thấy thêm
 * nút đánh dấu đã xử lý / đóng; khách trả lời thì ticket tự mở lại phía server.
 */
export function TicketThread({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const store = useHub();
  const staff = store.account?.role !== "Customer";
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const live = store.tickets.find((t) => t.id === ticket.id) ?? ticket;
  const end = useRef<HTMLDivElement>(null);

  /** `quiet`: lần hỏi định kỳ, lỗi mạng thoáng qua thì bỏ qua thay vì hiện báo lỗi đỏ. */
  const load = (quiet = false) =>
    api<Row[]>(staff ? `/service-desk/tickets/${ticket.id}/messages` : `/customer/tickets/${ticket.id}/messages`)
      .then((rows) => {
        const next = rows.map(toTicketMessage);
        // Giữ nguyên mảng cũ khi không có tin mới để không cuộn lại cuối mỗi lần hỏi.
        setMessages((prev) =>
          prev && prev.length === next.length && prev.at(-1)?.id === next.at(-1)?.id ? prev : next);
        const last = next.at(-1);
        if (last) useHub.getState().markTicketSeen(ticket.id, last.at);
      })
      .catch((e) => {
        if (!quiet) setError(errorText(e));
      });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, live.lastAt]);

  // Đang mở hội thoại thì hỏi tin mới mỗi 3 giây: bên kia nhắn là hiện luôn, không
  // phải đóng rồi mở lại. Ticket đang mở cũng không bật thông báo trùng.
  useEffect(() => {
    useHub.getState().setOpenTicket(ticket.id);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 3000);
    return () => {
      window.clearInterval(timer);
      useHub.getState().setOpenTicket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  // Bọc trong ngoặc: Edge/Chrome mới cho scrollIntoView trả về Promise, mà effect trả
  // về thứ không phải hàm thì React coi là hàm dọn dẹp và báo lỗi khi gỡ component.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async () => {
    if (body.trim().length < 2) return;
    setBusy(true);
    const err = await store.replyTicket(ticket.id, body.trim());
    setBusy(false);
    if (err) setError(err);
    else {
      setBody("");
      setError("");
      void load();
    }
  };

  const closed = live.status === "RESOLVED" || live.status === "CLOSED";

  return (
    <Dialog
      title={live.subject}
      subtitle={`${live.code} · ${TICKET_CATEGORY[live.category] ?? live.category}${live.orderCode ? ` · đơn ${live.orderCode}` : ""}${staff ? ` · ${live.customerName}` : ""}`}
      onClose={onClose}
      wide
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge value={live.status} />
        {staff && !closed && (
          <>
            <button className={rowBtn.primary} onClick={async () => report(await store.setTicketStatus(ticket.id, "RESOLVED"))}>
              Đánh dấu đã xử lý
            </button>
            <button className={rowBtn.muted} onClick={async () => report(await store.setTicketStatus(ticket.id, "CLOSED"))}>Đóng</button>
          </>
        )}
        {staff && closed && (
          <button className={rowBtn.ghost} onClick={async () => report(await store.setTicketStatus(ticket.id, "OPEN"))}>Mở lại</button>
        )}
      </div>

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}
      {!messages && !error && <p className="text-sm text-muted">Đang tải…</p>}
      <div className="space-y-3">
        {messages?.map((m) => {
          const mine = staff ? m.author === "ADMIN" : m.author === "CUSTOMER";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "bg-primary text-primary-ink" : "bg-slate-100 text-fg"}`}>
                <p className="mb-1 text-[11px] font-bold opacity-75">
                  {m.author === "ADMIN" ? "Cửa hàng" : staff ? live.customerName || "Khách hàng" : "Bạn"} · {dateTimeLabel(m.at)}
                </p>
                <p className="whitespace-pre-wrap leading-6">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <textarea
          className="min-h-20 w-full rounded-lg border border-line px-3 py-2.5 text-sm"
          placeholder={staff ? "Trả lời khách…" : "Nhắn thêm cho cửa hàng…"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button
            className="h-10 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-ink hover:opacity-95 disabled:opacity-60"
            disabled={busy || body.trim().length < 2}
            onClick={send}
          >
            {busy ? "Đang gửi…" : "Gửi"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
