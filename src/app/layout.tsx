import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM OS — 研发项目经理工作台",
  description: "AI 辅助的 IPD 研发项目全流程管理工具",
};

import ClientLayout from '@/components/shared/ClientLayout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full bg-white text-gray-900">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
