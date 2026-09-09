// ============================================================================
// 스마트 라이프 소모품 케어 AI 분석 엔진 및 회사별 매뉴얼 데이터베이스
// (app/lib/care-ai.ts)
// ============================================================================

import {
  ItemCategory,
  CareAnalysisResult,
  HealthStatus,
  UsageCondition,
  BrandPresetRule,
} from "../types";

/**
 * 1. 제조사(회사)별 공식 매뉴얼 권장 주기 데이터베이스
 * 주요 자동차, 가전, IT, 위생/생필품 브랜드의 공식 지침을 내장합니다.
 */
export const BRAND_PRESETS: BrandPresetRule[] = [
  // ── [차량] 현대/기아 ──
  {
    brand: "현대/기아",
    category: "차량",
    itemName: "엔진오일 및 오일필터",
    normalIntervalValue: 10000, // 10,000 km
    harshIntervalValue: 5000,   // 가혹 조건 5,000 km
    unit: "km",
    riskDescription: "엔진 내부 마모 급증, 슬러지(때) 고착, 연비 저하 및 엔진 소음 유발",
    tips: [
      "스마트스트림/터보 엔진은 가혹 조건(단거리/시내 정체) 시 5,000km 이내 교체를 강력 권장합니다.",
      "오일 교체 시 오일 필터와 에어클리너(흡기 필터)를 함께 점검·교체하세요."
    ]
  },
  {
    brand: "현대/기아",
    category: "차량",
    itemName: "에어컨/히터 캐빈 필터",
    normalIntervalValue: 10000, // 10,000 km 또는 6개월
    harshIntervalValue: 5000,
    unit: "km",
    riskDescription: "송풍구 악취, 미세먼지 차단율 급감, 차량 내 곰팡이 포자 유입으로 호흡기 질환 유발",
    tips: [
      "봄철 황사/미세먼지 시즌 직전과 겨울 히터 가동 직전에 연 2회 교체를 권장합니다.",
      "초미세먼지(PM2.5) 활성탄 항균 필터 규격을 확인하세요."
    ]
  },
  {
    brand: "현대/기아",
    category: "차량",
    itemName: "브레이크 패드",
    normalIntervalValue: 40000, // 40,000 km
    harshIntervalValue: 25000,
    unit: "km",
    riskDescription: "제동 거리 증가, 브레이크 디스크(로터) 파손 및 쇠 긁히는 소음 발생, 안전 제동 불가",
    tips: [
      "패드 잔여 두께가 3mm 이하일 경우 즉시 교체해야 로터 손상을 막을 수 있습니다.",
      "엔진오일 교환 시 휠 안쪽 패드 마모도를 정비사에게 함께 체크 요청하세요."
    ]
  },

  // ── [차량] BMW ──
  {
    brand: "BMW",
    category: "차량",
    itemName: "엔진오일 (BMW LL-01/LL-04 규격)",
    normalIntervalValue: 15000, // 15,000 km 또는 12개월
    harshIntervalValue: 10000,
    unit: "km",
    riskDescription: "BMW 고회전/터보 엔진 특성상 슬러지 생성 시 밸브트로닉 및 바노스(VANOS) 부품 고장 유발",
    tips: [
      "BMW 공식 Longlife 승인(LL-04 / LL-17FE+) 규격 합성유만 사용해야 합니다.",
      "차량 iDrive의 소모품 상태(CBS 서비스 알림)를 함께 확인하세요."
    ]
  },

  // ── [차량] 벤츠 (Mercedes-Benz) ──
  {
    brand: "벤츠",
    category: "차량",
    itemName: "엔진오일 (MB 229.5/229.51 규격)",
    normalIntervalValue: 15000,
    harshIntervalValue: 10000,
    unit: "km",
    riskDescription: "캠샤프트 마모 및 DPF(디젤)/GPF(가솔린) 필터 막힘 현상 발생",
    tips: [
      "벤츠 ASSYST PLUS 점검 알림(A서비스/B서비스) 주기에 맞춰 순정 규격 오일을 주입하세요."
    ]
  },

  // ── [차량] 테슬라 (Tesla) ──
  {
    brand: "테슬라",
    category: "차량",
    itemName: "캐빈 에어 필터",
    normalIntervalValue: 24, // 24개월 (2년)
    harshIntervalValue: 12,
    unit: "개월",
    riskDescription: "에어컨 공조기 산화 냄새 및 바이오웨폰 디펜스 모드 공기정화 성능 저하",
    tips: [
      "모델3/Y는 2년마다, 모델S/X 대형 HEPA 필터는 3년 주기로 교체를 권장합니다."
    ]
  },
  {
    brand: "테슬라",
    category: "차량",
    itemName: "브레이크 오일 (수분 함량)",
    normalIntervalValue: 24, // 24개월 (2년)
    harshIntervalValue: 24,
    unit: "개월",
    riskDescription: "브레이크액 내 수분 응결로 급제동 시 베이퍼 록(브레이크 스펀지 현상) 발생 위험",
    tips: [
      "회생제동을 주로 쓰더라도 브레이크액은 2년마다 수분 테스터기로 점검하세요."
    ]
  },

  // ── [가전] LG전자 ──
  {
    brand: "LG전자",
    category: "가전",
    itemName: "퓨리케어 공기청정기 일체형 V필터",
    normalIntervalValue: 12, // 12개월
    harshIntervalValue: 6,
    unit: "개월",
    riskDescription: "필터 포화로 미세먼지 집진 불가, 모터 과부하 및 송풍구 쉰내/먼지 냄새",
    tips: [
      "겉면의 '극세 필터(프리필터)'는 1~2개월마다 샤워기로 물세척 후 그늘에 말려 재장착하면 필터 수명이 대폭 연장됩니다.",
      "LG ThinQ 앱의 필터 잔여량 수치와 함께 교체하세요."
    ]
  },
  {
    brand: "LG전자",
    category: "가전",
    itemName: "정수기 메인 정수 복합필터",
    normalIntervalValue: 6, // 6개월
    harshIntervalValue: 4,
    unit: "개월",
    riskDescription: "중금속 및 잔류 염소 여과력 상실, 음용수 내 세균 번식 및 수질 악화",
    tips: [
      "정수기 자가 교체 시 교체 후 약 5~10분간 출수하여 잔여 공기와 세척수를 빼주세요."
    ]
  },

  // ── [가전] 삼성전자 ──
  {
    brand: "삼성전자",
    category: "가전",
    itemName: "비스포크 큐브 에어 공기청정기 필터",
    normalIntervalValue: 12, // 12개월
    harshIntervalValue: 6,
    unit: "개월",
    riskDescription: "항균 항곰팡이 성능 저하 및 실내 포름알데히드 등 유해가스 탈취력 소멸",
    tips: [
      "스마트싱스(SmartThings) 앱에서 필터 교체 리셋을 실행해야 필터 센서 수치가 초기화됩니다."
    ]
  },

  // ── [가전] 다이슨 (Dyson) ──
  {
    brand: "다이슨",
    category: "가전",
    itemName: "퓨어 핫앤쿨 360도 콤비 필터",
    normalIntervalValue: 12, // 하루 12시간 가동 기준 12개월
    harshIntervalValue: 6,
    unit: "개월",
    riskDescription: "다이슨 본체 디스플레이 F 경고등 점등 및 풍량 감소, 모터 소음 유발",
    tips: [
      "다이슨 정품 필터는 물세척이 불가하며, 먼지센서 홀을 주기적으로 면봉으로 닦아주세요."
    ]
  },

  // ── [가전] 샤오미 (Xiaomi) ──
  {
    brand: "샤오미",
    category: "가전",
    itemName: "미에어 원통형 스마트 필터",
    normalIntervalValue: 6, // 3~6개월
    harshIntervalValue: 3,
    unit: "개월",
    riskDescription: "바닥면 RFID 수명 0% 인식으로 청정 풍량 제한 및 알림음 지속",
    tips: [
      "하단 RFID 태그가 부착된 정품 또는 고규격 호환 필터를 사용하세요."
    ]
  },

  // ── [IT기기] 애플 (Apple) ──
  {
    brand: "애플",
    category: "IT기기",
    itemName: "아이폰 / 맥북 배터리",
    normalIntervalValue: 24, // 24개월 (또는 80% 이하 도달 시)
    harshIntervalValue: 18,
    unit: "개월",
    riskDescription: "배터리 스웰링(부풀림)으로 인한 디스플레이 들뜸, 급격한 배터리 꺼짐, 기기 성능 저하(스로틀링)",
    tips: [
      "설정 > 배터리 > 성능 상태에서 최대 용량이 80% 미만으로 떨어졌을 때 공인 서비스센터에서 교체를 권장합니다.",
      "충전 중 고사양 게임/영상 편집 등 고열 발생을 피하면 배터리 수명을 1년 이상 늘릴 수 있습니다."
    ]
  },

  // ── [생필품] 오랄비 / 필립스 ──
  {
    brand: "오랄비/필립스",
    category: "생필품/기타",
    itemName: "전동칫솔 헤드 리필",
    normalIntervalValue: 3, // 3개월
    harshIntervalValue: 2,
    unit: "개월",
    riskDescription: "칫솔모 탄력 저하로 플라그 제거율 40% 이상 감소, 벌어진 칫솔모로 인한 잇몸 상처 및 마모",
    tips: [
      "인디케이터 블루 모의 색상이 절반 이상 탈색되면 즉시 교체해야 치주염을 예방할 수 있습니다."
    ]
  },
  {
    brand: "일반(공통)",
    category: "생필품/기타",
    itemName: "일반 칫솔",
    normalIntervalValue: 2, // 2개월
    harshIntervalValue: 1,
    unit: "개월",
    riskDescription: "습한 화장실 환경으로 변기보다 수백 배 많은 대장균/녹농균 번식, 구강 감염 위험",
    tips: [
      "칫솔모가 벌어지지 않았더라도 1~2달에 한 번은 위생을 위해 새 것으로 교체하세요."
    ]
  }
];

/**
 * 2. 브랜드 미지정 시 적용되는 산업 표준 기본 지침 (Fallback)
 */
export const CATEGORY_DEFAULTS: Record<
  ItemCategory,
  {
    normalIntervalValue: number;
    harshIntervalValue: number;
    unit: "km" | "개월" | "일";
    riskDescription: string;
    tips: string[];
  }
> = {
  차량: {
    normalIntervalValue: 10000,
    harshIntervalValue: 7000,
    unit: "km",
    riskDescription: "차량 부품 마모, 제동/주행 안정성 저하 및 안전 사고 위험 발생",
    tips: [
      "정기적인 계기판 점검 및 안전 정비소 방문을 추천합니다.",
      "가혹 주행 환경(도심 정체 등)에서는 주기를 30% 단축하세요."
    ]
  },
  가전: {
    normalIntervalValue: 12,
    harshIntervalValue: 6,
    unit: "개월",
    riskDescription: "가전 효율 저하, 모터 과열 위험 및 실내 위생/공기질 저하",
    tips: [
      "흡입구 및 겉면 먼지를 주기적으로 청소기로 제거하세요.",
      "장마철에는 습기로 인한 냄새가 발생할 수 있으니 건조에 유의하세요."
    ]
  },
  IT기기: {
    normalIntervalValue: 24,
    harshIntervalValue: 18,
    unit: "개월",
    riskDescription: "기기 배터리 수명 저하, 급방전 및 발열로 인한 하드웨어 수명 단축",
    tips: [
      "배터리를 20%~80% 구간에서 유지하는 것이 리튬이온 수명 보호에 가장 좋습니다.",
      "직사광선이나 차량 내부 등 고온 방치를 피하세요."
    ]
  },
  "생필품/기타": {
    normalIntervalValue: 3,
    harshIntervalValue: 1,
    unit: "개월",
    riskDescription: "세균 및 곰팡이 번식으로 인한 위생 악화 및 본래 기능 상실",
    tips: [
      "신체에 직접 닿는 소모품은 외형 변화가 없더라도 정해진 주기에 폐기하세요.",
      "통풍이 잘되고 건조한 환경에서 보관하세요."
    ]
  }
};

/**
 * 3. 지능형 AI 분석 실행 함수
 * 브랜드 및 사용 조건, 현재 사용량을 종합하여 수명(%)과 다음 교체일을 계산합니다.
 */
export function analyzeConsumableItem(params: {
  category: ItemCategory;
  brand?: string;
  itemName: string;
  installedDate: string; // YYYY-MM-DD
  currentUsage: number; // 차량: km, 기타: 개월 또는 일수
  condition: UsageCondition;
}): CareAnalysisResult {
  const { category, brand, itemName, installedDate, currentUsage, condition } = params;

  // 1) 브랜드 프리셋 매칭 검색
  let matchedPreset: BrandPresetRule | undefined;
  if (brand && brand.trim().length > 0) {
    const cleanBrand = brand.trim().toLowerCase();
    matchedPreset = BRAND_PRESETS.find(
      (p) =>
        p.category === category &&
        (p.brand.toLowerCase().includes(cleanBrand) ||
          cleanBrand.includes(p.brand.toLowerCase())) &&
        (itemName.toLowerCase().includes(p.itemName.toLowerCase()) ||
          p.itemName.toLowerCase().includes(itemName.toLowerCase()))
    );

    // 브랜드명만이라도 일치하는 첫 번째 프리셋 탐색
    if (!matchedPreset) {
      matchedPreset = BRAND_PRESETS.find(
        (p) =>
          p.category === category &&
          (p.brand.toLowerCase().includes(cleanBrand) ||
            cleanBrand.includes(p.brand.toLowerCase()))
      );
    }
  }

  // 2) 기준 주기(Interval) 및 단위 결정
  let intervalValue = 0;
  let unit: "km" | "개월" | "일" = "개월";
  let riskText = "";
  let tips: string[] = [];
  let isBrandOfficial = false;
  let appliedBrandName = brand || "표준 규격";

  if (matchedPreset) {
    isBrandOfficial = true;
    appliedBrandName = matchedPreset.brand;
    unit = matchedPreset.unit;
    intervalValue =
      condition === "harsh"
        ? matchedPreset.harshIntervalValue
        : matchedPreset.normalIntervalValue;
    riskText = matchedPreset.riskDescription;
    tips = matchedPreset.tips;
  } else {
    // Fallback: 산업 표준
    const fallback = CATEGORY_DEFAULTS[category];
    unit = fallback.unit;
    intervalValue =
      condition === "harsh"
        ? fallback.harshIntervalValue
        : fallback.normalIntervalValue;
    riskText = fallback.riskDescription;
    tips = fallback.tips;
  }

  // 3) 잔여 수명(%) 및 건강 상태(Status) 계산
  // 날짜 기반 경과일수 계산
  const installDateTime = new Date(installedDate).getTime();
  const nowTime = new Date().getTime();
  const diffDays = Math.max(0, Math.floor((nowTime - installDateTime) / (1000 * 60 * 60 * 24)));
  const diffMonths = Math.max(0, diffDays / 30.4);

  let remainingPercent = 100;

  if (unit === "km") {
    // 주행거리 기준
    const usageKm = currentUsage || 0;
    const usedRatio = usageKm / intervalValue;
    remainingPercent = Math.max(0, Math.round((1 - usedRatio) * 100));
  } else if (unit === "개월") {
    // 개월수 기준 (설치일로부터 경과된 개월수 사용)
    const elapsed = diffMonths;
    const usedRatio = elapsed / intervalValue;
    remainingPercent = Math.max(0, Math.round((1 - usedRatio) * 100));
  } else {
    // 일수 기준
    const elapsed = diffDays;
    const usedRatio = elapsed / intervalValue;
    remainingPercent = Math.max(0, Math.round((1 - usedRatio) * 100));
  }

  // 상태 판정
  let status: HealthStatus = "GOOD";
  if (remainingPercent <= 15) {
    status = "REPLACE_NOW";
  } else if (remainingPercent <= 40) {
    status = "CAUTION";
  } else {
    status = "GOOD";
  }

  // 4) 다음 교체 예정일 계산 (YYYY-MM-DD)
  let estimatedNextDate = "";
  if (unit === "km") {
    // 일일 평균 주행거리 가정 (한국 평균 연 15,000km -> 일 약 41km)
    const remainingKm = Math.max(0, intervalValue - (currentUsage || 0));
    const daysLeft = Math.round(remainingKm / 41);
    const nextDateObj = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
    estimatedNextDate = nextDateObj.toISOString().split("T")[0];
  } else if (unit === "개월") {
    const installDateObj = new Date(installedDate);
    installDateObj.setMonth(installDateObj.getMonth() + intervalValue);
    estimatedNextDate = installDateObj.toISOString().split("T")[0];
  } else {
    const installDateObj = new Date(installedDate);
    installDateObj.setDate(installDateObj.getDate() + intervalValue);
    estimatedNextDate = installDateObj.toISOString().split("T")[0];
  }

  // 5) 사용자 요약 문장 생성
  let userSummary = "";
  if (status === "REPLACE_NOW") {
    userSummary = `[경고] ${itemName}의 권장 수명이 거의 소진되었습니다(잔여 ${remainingPercent}%). ${riskText.slice(0, 45)}... 등 안전 및 위생상 문제가 발생할 수 있으니 즉시 교체하시기 바랍니다.`;
  } else if (status === "CAUTION") {
    userSummary = `현재 ${itemName}의 수명은 약 ${remainingPercent}% 남았습니다. 교체 예정일(${estimatedNextDate})을 미리 확인하시고, 사전 부품 준비를 권장합니다.`;
  } else {
    userSummary = `${appliedBrandName} 권장 기준에 맞춰 안전하게 관리되고 있습니다(잔여 수명 ${remainingPercent}%). 현재 사용 패턴을 유지하시면 ${estimatedNextDate}경 교체하시면 됩니다.`;
  }

  return {
    item_identification: {
      category,
      item_name: itemName,
      installed_or_purchased_date: installedDate,
      current_mileage_or_usage:
        unit === "km"
          ? `현재 주행거리 ${currentUsage.toLocaleString()} km`
          : `사용 기간 약 ${Math.round(diffMonths)}개월 경과`,
      confidence_score: isBrandOfficial ? "HIGH" : "MEDIUM",
      brand_applied: appliedBrandName,
      is_brand_official: isBrandOfficial,
    },
    replacement_analysis: {
      recommended_interval: `${intervalValue.toLocaleString()} ${unit} (${condition === "harsh" ? "가혹 조건 적용" : "일반 조건"})`,
      estimated_next_date: estimatedNextDate,
      remaining_life_percent: remainingPercent,
      status,
    },
    risk_and_tips: {
      risk_if_delayed: riskText,
      maintenance_tips: tips,
    },
    user_summary: userSummary,
  };
}
