import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Studio — Twitter Clone",
    template: "%s / AI Studio Twitter Clone",
  },
  description:
    "AI Studio Twitter Clone — a full-stack social network built with Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-[#e7e9ea]">{children}</body>
    </html>
  );
}
