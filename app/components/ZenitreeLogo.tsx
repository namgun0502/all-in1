// ============================================================================
// 제니트리(Janytree) 공식 브랜드 로고 컴포넌트
// (app/components/ZenitreeLogo.tsx)
// JT 디자인 시스템 Foundation v1.0 §9 브랜드 규격 준수 (심볼 J⁺ 및 워드마크)
// ============================================================================

import React from "react";

interface ZenitreeLogoProps {
  /**
   * 로고 높이 (단위: px, 헤더 기본 권장 28~32px)
   */
  height?: number;
  /**
   * 테마 모드: dark(어두운 배경용 흰색), light(밝은 배경용 먹색)
   */
  theme?: "dark" | "light";
  /**
   * 심볼(J⁺)만 표시할지, 워드마크(Janytree)까지 함께 표시할지 여부
   */
  variant?: "symbol" | "horizontal";
}

export default function ZenitreeLogo({
  height = 28,
  theme = "dark",
  variant = "horizontal",
}: ZenitreeLogoProps) {
  // 테마에 따른 색상 정의 (Charcoal #1F2328 또는 White #FFFFFF)
  const textColor = theme === "dark" ? "#FFFFFF" : "#1F2328";
  const plusColor = "#305CDE"; // 제니트리 포인트 블루 (상호작용/강조)

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
        height: `${height}px`,
      }}
    >
      {/* ── 1. 공식 심볼 마크 (J⁺) ── */}
      <svg
        height={height}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {/* 심볼 배경 둥근 사각 배지 */}
        <rect
          width="36"
          height="36"
          rx="8"
          fill={theme === "dark" ? "#2B313A" : "#F0F2F5"}
        />

        {/* 정밀한 'J' 알파벳 획 */}
        <path
          d="M19 9V20C19 22.76 16.76 25 14 25C11.24 25 9 22.76 9 20"
          stroke={textColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 우측 상단 '⁺' 플러스 기호 (R&D 정밀성 상징) */}
        <path
          d="M24 10V16M21 13H27"
          stroke={plusColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* ── 2. 공식 워드마크 (Janytree) ── */}
      {variant === "horizontal" && (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span
            style={{
              fontFamily: "'Figtree', 'Pretendard Variable', sans-serif",
              fontSize: `${Math.round(height * 0.65)}px`,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: textColor,
              lineHeight: 1.1,
            }}
          >
            Janytree
          </span>
          <span
            style={{
              fontFamily: "'Pretendard Variable', sans-serif",
              fontSize: `${Math.max(10, Math.round(height * 0.34))}px`,
              fontWeight: 500,
              color: theme === "dark" ? "#9CA3AF" : "#6B7280",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            스마트 라이프 케어
          </span>
        </div>
      )}
    </div>
  );
}
