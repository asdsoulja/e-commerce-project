import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EECS4413 Accessories e-Store",
  description: "Computer accessories store scaffold aligned with EECS 4413 project specification"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">
            <header className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">EECS 4413 Silly Scripters Team Project</p>
              <h1 className="text-2xl font-bold text-text">Computer Accessories e-Store</h1>
              <p className="mb-4 mt-1 text-sm text-slate-600">
                MVC + DAO backend, App Router frontend, and complete customer/admin flows.
              </p>
              <p className="mb-1 text-sm font-bold text-slate-600">
                For access to the admin panel, use username <code className="rounded bg-slate-100 px-1 font-mono text-sm">admin@estore.local</code> and password <code className="rounded bg-slate-100 px-1 font-mono text-sm">Admin123!</code>
              </p>
              <p className="mb-2 text-sm text-slate-600">
                You can use these buttons to quickly navigate to different pages for testing & grading, but feel free to explore the app on your own as well!
              </p>
              <Nav />
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
