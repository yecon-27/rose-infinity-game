import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "玫瑰无限 | Rose Infinity",
  description:
    "一段好好的感情，是怎么一点点走散的。回到那些日子里，找出你当年没看见的瞬间。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-serif min-h-screen">{children}</body>
    </html>
  );
}
