import { createRootRoute, HeadContent, Outlet, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Thuê Máy Hub" },
      { name: "description", content: "Quản lý thuê máy tính và boxphone cho admin, nhân viên và khách hàng." },
      { name: "theme-color", content: "#4058cf" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-center">
      <div>
        <p className="text-sm font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Không tìm thấy trang</h1>
        <a className="mt-4 inline-block text-sm font-bold text-primary" href="/">
          Về trang chủ
        </a>
      </div>
    </main>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="text-2xl font-extrabold">Không tải được trang</h1>
        <p className="mt-3 text-sm text-muted">{errorMessage}</p>
        {reset && (
          <button className="mt-6 h-11 rounded-lg bg-primary px-4 text-sm font-extrabold text-primary-ink" onClick={() => reset()}>
            Thử lại
          </button>
        )}
      </div>
    </main>
  );
}
