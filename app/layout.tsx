import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enough · Real Value",
  description: "Cheapest over-ear that clears the bar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
