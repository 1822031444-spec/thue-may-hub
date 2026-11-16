import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/*
 * Chuyển tiếp mọi yêu cầu /api/* sang backend Express (server/ ở thư mục gốc).
 *
 * Khi chạy `vite dev`, khung SSR của TanStack Start nhận mọi đường dẫn trước cả
 * proxy của Vite, nên /api phải được chuyển tiếp ngay tại đây. Cookie phiên đi
 * qua nguyên vẹn, nhờ vậy trình duyệt chỉ thấy một nguồn duy nhất.
 *
 * Bản build (`npm run hub:start`) không dùng file này: Express phục vụ cả giao
 * diện tĩnh lẫn API trên cùng một cổng.
 */
async function forward({ request }: { request: Request }) {
  const api = (typeof process !== "undefined" && process.env.HUB_API) || "http://127.0.0.1:8789";
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let res: Response;
  try {
    res = await fetch(`${api}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { message: `Không kết nối được máy chủ API (${api}). Hãy chạy "npm run hub" ở thư mục gốc dự án.` },
      { status: 502 },
    );
  }

  // fetch đã giải nén nội dung, nên bỏ các header mô tả bản nén cũ.
  const out = new Headers(res.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: { ANY: forward },
  },
});
