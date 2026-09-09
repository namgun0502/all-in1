// ============================================================================
// 스마트 라이프 소모품 케어 앱 - 데이터 타입 정의 (app/types.ts)
// 제니트리 디자인 시스템 v3.0 규격 및 AI 분석 표준 스키마 준수
// ============================================================================

/**
 * 소모품 카테고리 종류
 */
export type ItemCategory = "차량" | "가전" | "IT기기" | "생필품/기타";

/**
 * 소모품 건강/수명 상태 (제니트리 시맨틱 컬러 매핑)
 * - GOOD: 양호 (녹색 #14A870)
 * - CAUTION: 점검/주의 필요 (노란색 #F0B01C)
 * - REPLACE_NOW: 즉시 교체 필요 (빨간색 #E14B4B)
 */
export type HealthStatus = "GOOD" | "CAUTION" | "REPLACE_NOW";

/**
 * 사용 환경 / 조건
 * - normal: 일반적인 사용 환경
 * - harsh: 가혹 조건 (단거리 반복 주행, 먼지 많은 환경, 24시간 가동 등)
 */
export type UsageCondition = "normal" | "harsh";

/**
 * AI 분석 결과 인터페이스 (사용자 요청 JSON 구조 100% 호환)
 */
export interface CareAnalysisResult {
  item_identification: {
    category: ItemCategory;
    item_name: string;
    installed_or_purchased_date: string | null; // "YYYY-MM-DD"
    current_mileage_or_usage: string; // 현재 주행거리 또는 사용 기간
    confidence_score: "HIGH" | "MEDIUM" | "LOW";
    brand_applied?: string; // 적용된 브랜드/제조사명 (예: 현대, LG전자)
    is_brand_official?: boolean; // 공식 매뉴얼 기준 여부
  };
  replacement_analysis: {
    recommended_interval: string; // 추천 교체 주기 (예: 10,000km 또는 12개월)
    estimated_next_date: string; // YYYY-MM-DD
    remaining_life_percent: number; // 0 ~ 100
    status: HealthStatus;
  };
  risk_and_tips: {
    risk_if_delayed: string; // 교체 지연 시 위험 요소
    maintenance_tips: string[]; // 관리 팁 목록
  };
  user_summary: string; // 2~3줄 요약 문장
}

/**
 * 등록된 소모품 자산 데이터 구조 (로컬스토리지 저장용)
 */
export interface ConsumableItem {
  id: string; // 고유 ID (UUID)
  brand: string; // 제조사/회사명 (예: 현대, LG전자, 다이슨, Apple 등)
  name: string; // 소모품명 (예: 엔진오일, HEPA 필터 등)
  category: ItemCategory; // 카테고리
  installedDate: string; // 장착/구매일 (YYYY-MM-DD)
  condition: UsageCondition; // 사용 환경
  currentUsage: number; // 현재 수치 (차량: km, 가전/IT: 일수 또는 시간)
  usageUnit: "km" | "개월" | "일"; // 단위
  analysis: CareAnalysisResult; // AI 분석 결과
  createdAt: string; // 등록일시 ISO 문자열
}

/**
 * 제조사(회사)별 프리셋 표준 지침 데이터 인터페이스
 */
export interface BrandPresetRule {
  brand: string; // 제조사명
  category: ItemCategory;
  itemName: string; // 소모품명
  normalIntervalValue: number; // 일반 조건 기준 주기 (km 또는 개월)
  harshIntervalValue: number; // 가혹 조건 기준 주기
  unit: "km" | "개월" | "일";
  riskDescription: string; // 지연 시 위험성
  tips: string[]; // 제조사 맞춤 권장 팁
}
