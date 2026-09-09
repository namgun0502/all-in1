// ============================================================================
// 스마트 라이프 소모품 케어 앱 - 루트 레이아웃 (app/layout.tsx)
// 제니트리 통합 디자인 시스템 v3.0 및 PWA 앱 설치 매니페스트 구성
// ============================================================================

import type { Metadata, Viewport } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "스마트 라이프 소모품 케어 | Janytree Care",
  description: "차량, 가전, IT기기, 생필품 등 모든 자산의 수명과 교체 주기를 회사별 공식 기준으로 정밀 분석·관리하는 제니트리 케어 솔루션",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/logo/logo-sky.svg",
    apple: "/brand/logo/logo-sky.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#38BDF8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
