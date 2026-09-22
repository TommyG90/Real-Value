import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enough · Real Value",
  description: "The cheapest over-ear headphones that meet an honest, citeable bar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
