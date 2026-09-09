// ============================================================================
// 스마트 라이프 소모품 케어 앱 - 루트 레이아웃 (app/layout.tsx)
// 제니트리 통합 디자인 시스템 v3.0 웹폰트 및 메타데이터 구성
// ============================================================================

import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "스마트 라이프 소모품 케어 | ZeniTree Care",
  description: "차량, 가전, IT기기, 생필품 등 모든 자산의 수명과 교체 주기를 회사별 공식 기준으로 정밀 분석·관리하는 케어 솔루션",
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
