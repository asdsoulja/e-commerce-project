import type { Metadata } from "next";
import { AppToolbar } from "@/components/ui/app-toolbar";
import { GradingNote } from "@/components/ui/grading-note";
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
            <GradingNote />
            <AppToolbar />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
