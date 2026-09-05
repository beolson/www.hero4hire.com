import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Provider } from "@/components/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hero4Hire", template: "%s | Hero4Hire" },
  description: "Documentation, guides, and updates from Hero4Hire.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
