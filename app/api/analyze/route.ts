// ============================================================================
// Google Gemini AI 실시간 분석 API 엔드포인트
// (app/api/analyze/route.ts)
// Cloudflare Pages & OpenNext 호환 표준 Fetch 기반 연동
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { CareAnalysisResult } from "@/app/types";

// Cloudflare Workers / Pages Edge 런타임 호환
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      apiKey,
      brand,
      category,
      itemName,
      installedDate,
      currentUsage,
      condition,
      imageBase64, // 멀티모달 이미지 (선택 사항)
      imageMimeType,
    } = body;

    // 1. API 키 확인 (클라이언트 전달 키 우선, 없으면 서버 환경변수 탐색)
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey.trim().length === 0) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message: "Google Gemini API 키가 설정되지 않았습니다. API 키를 입력해 주세요.",
        },
        { status: 400 }
      );
    }

    // 2. Gemini 프롬프트 구성 (사용자 첫 요청 규격 스키마 100% 반영)
    const systemPrompt = `
당신은 차량, 가전제품, IT 기기, 생필품 등 사용자의 모든 자산과 소모품의 수명 및 교체 주기를 분석하고 관리해 주는 '스마트 라이프 소모품 케어 AI 어시스턴트'입니다.

[분석 대상 정보]
- 카테고리: ${category || "미지정"}
- 제조사(회사/브랜드): ${brand || "미지정"}
- 소모품명: ${itemName || "미지정"}
- 장착/구매일: ${installedDate || "미지정"}
- 현재 사용량/주행거리: ${currentUsage || 0}
- 사용 환경: ${condition === "harsh" ? "가혹 조건 (단거리 반복 주행, 먼지 많은 환경, 고부하 등)" : "일반 표준 환경"}

[작업 지침]
1. 첨부된 이미지(제품 라벨, 영수증, 모델명 스티커, 계기판 등)가 있다면 이미지 속 텍스트와 시각 정보를 최우선으로 분석하세요.
2. 입력된 소모품명('${itemName || ""}')의 실제 물리적/전기적 특성을 절대 왜곡하지 마세요. (예: 전자레인지 마그네트론과 같은 초고주파/전자 부품에 '공기 필터 포화', '미세먼지 집진' 같은 전혀 엉뚱한 필터 관련 문구를 생성해서는 절대로 안 됩니다. 반드시 해당 소모품 고유의 작동 원리와 고장 위험을 분석하세요.)
3. 제조사(${brand || "해당 제조사"}) 공식 권장 표준 교체 주기와 사용자의 환경 조건(${condition === "harsh" ? "가혹 조건" : "일반 조건"})을 반영하여 최적의 '다음 교체 예정일'과 '남은 수명 백분율(%)'을 산출하세요.
4. 교체 시기를 놓쳤을 때 발생할 수 있는 실제 위험 요소(출력 저하, 과열, 부품 소손, 안전 사고 등)와 실용적인 전문 정비/관리 팁을 제공하세요.
5. 반드시 순수한 JSON 형식만 응답하세요. 마크다운(\`\`\`json 등) 코드블록 없이 순수 JSON 객체만 반환해야 합니다.

[반드시 준수할 JSON 출력 규격]
{
  "item_identification": {
    "category": "${category || "차량 | 가전 | IT기기 | 생필품/기타"}",
    "item_name": "제품명 또는 소모품명",
    "installed_or_purchased_date": "${installedDate || "YYYY-MM-DD"}",
    "current_mileage_or_usage": "현재 주행거리 또는 사용 기간/빈도",
    "confidence_score": "HIGH",
    "brand_applied": "${brand || "표준 규격"}",
    "is_brand_official": true
  },
  "replacement_analysis": {
    "recommended_interval": "추천 교체 주기 (예: 10,000km 또는 12개월)",
    "estimated_next_date": "YYYY-MM-DD",
    "remaining_life_percent": 85,
    "status": "GOOD"
  },
  "risk_and_tips": {
    "risk_if_delayed": "교체 지연 시 위험 요소",
    "maintenance_tips": ["사용자 관리 팁 1", "사용자 관리 팁 2"]
  },
  "user_summary": "사용자가 한눈에 보기 쉬운 2~3줄 요약 문장"
}
* 주의: status 필드는 반드시 "GOOD", "CAUTION", "REPLACE_NOW" 중 하나여야 합니다 (잔여 수명 40% 이하는 CAUTION, 15% 이하는 REPLACE_NOW).
`;

    // 3. Gemini REST API 요청 바디 구성 (멀티모달 지원)
    const parts: Array<Record<string, unknown>> = [{ text: systemPrompt }];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: imageMimeType,
          data: imageBase64,
        },
      });
    }

    // 최신 gemini-2.5-flash 모델 우선 호출 (호환성 확보)
    const modelName = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey.trim()}`;

    const geminiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API Error:", errorData);
      return NextResponse.json(
        {
          error: "GEMINI_API_FAIL",
          message: `Gemini API 호출에 실패했습니다: ${geminiResponse.status} ${geminiResponse.statusText}`,
          detail: errorData,
        },
        { status: geminiResponse.status }
      );
    }

    const geminiJson = await geminiResponse.json();
    const candidateText =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return NextResponse.json(
        { error: "EMPTY_RESPONSE", message: "Gemini로부터 분석 결과를 받지 못했습니다." },
        { status: 500 }
      );
    }

    // JSON 파싱 (혹시 모를 마크다운 블록 제거 처리)
    let cleanJson = candidateText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.slice(0, -3);
    }

    const parsedResult: CareAnalysisResult = JSON.parse(cleanJson.trim());

    return NextResponse.json({
      success: true,
      analysis: parsedResult,
      modelUsed: modelName,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("서버 분석 오류:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: err.message || "분석 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
