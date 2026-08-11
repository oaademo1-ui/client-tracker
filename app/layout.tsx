import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Tracker",
  description: "A simple shared task board for small teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
