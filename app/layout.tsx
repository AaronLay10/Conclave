import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conclave",
  description: "Kingdom event planning and coordination for Rise of Kingdoms",
  applicationName: "Conclave"
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
