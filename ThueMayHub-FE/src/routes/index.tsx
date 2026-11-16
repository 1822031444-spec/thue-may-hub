import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import HubApp from "@/components/hub-app";

/*
 * Ứng dụng chỉ chạy phía trình duyệt. Trang dựng sẵn (chế độ SPA) bọc route này trong
 * một Suspense rỗng; nếu lần hydrate đầu không bọc y như thế, hoặc vẽ ngay màn chờ,
 * React báo lệch HTML (lỗi #418) rồi dựng lại cả cây. `wrapInSuspense` buộc cả hai
 * phía cùng bọc, `ClientOnly` giữ phần bên trong rỗng cho tới khi gắn xong vào trang.
 */
export const Route = createFileRoute("/")({ ssr: false, wrapInSuspense: true, component: Home });

function Home() {
  return (
    <ClientOnly fallback={null}>
      <HubApp />
    </ClientOnly>
  );
}
