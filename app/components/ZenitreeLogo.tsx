// ============================================================================
// 제니트리(Janytree) 공식 정품 브랜드 로고 컴포넌트
// (app/components/ZenitreeLogo.tsx)
// JT 디자인 시스템 Foundation v1.0 §9 공식 로고 자산(/brand/logo/) 직접 연동
// ============================================================================

import React from "react";

interface ZenitreeLogoProps {
  /**
   * 로고 높이 (단위: px, 헤더 기본 권장 28~32px, 로그인 카드 48~60px)
   */
  height?: number;
  /**
   * 테마 모드: dark(어두운 배경용 흰색 로고), light(밝은 배경용 먹색 로고)
   */
  theme?: "dark" | "light";
  /**
   * 로고 형태: h(가로형 - 기본), v(세로형)
   */
  variant?: "h" | "v";
  /**
   * 추가 클래스명
   */
  className?: string;
}

export default function ZenitreeLogo({
  height = 30,
  theme = "dark",
  variant = "h",
  className = "",
}: ZenitreeLogoProps) {
  // 가이드라인 9-1 파일 명명 규칙 준수
  // - dark 테마: 어두운 배경이므로 흰색 로고(-light) 사용
  // - light 테마: 밝은 배경이므로 먹색 로고 사용
  const logoSrc =
    variant === "v"
      ? theme === "dark"
        ? "/brand/logo/logo-v-light.svg"
        : "/brand/logo/logo-v.svg"
      : theme === "dark"
      ? "/brand/logo/logo-h-light.svg"
      : "/brand/logo/logo-h.svg";

  return (
    <div
      className={`jt-logo-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        userSelect: "none",
      }}
    >
      <img
        src={logoSrc}
        alt="Janytree 제니트리 공식 로고"
        style={{
          height: `${height}px`,
          width: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
