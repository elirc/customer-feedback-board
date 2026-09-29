import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Feedback Board",
  description: "A realistic feedback management training application.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
