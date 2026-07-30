import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoK Events Command",
  description: "Kingdom and alliance event planning for Rise of Kingdoms",
  applicationName: "RoK Events Command"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
