import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "过滤器 | The Filter",
  description: "一对回避型×回避型的情侣,一段没有争吵、却在沉默中耗尽的关系。",
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
