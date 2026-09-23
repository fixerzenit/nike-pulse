import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nike, today. — Brand pulse",
  description:
    "A quick, instinctive brand pulse. Independent personal research.",
  robots: { index: false, follow: false },
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
