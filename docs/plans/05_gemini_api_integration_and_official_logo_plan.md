# 05_제니트리 공식 로고(J⁺) 적용 및 실제 Gemini AI API 연동 계획서

남건, 요청하신 **"제니트리 공식 로고(J⁺ Janytree) 완벽 적용"**과 **"실제 Google Gemini AI API 실시간 연동 (이미지/텍스트 분석)"** 구현 계획서입니다.

---

## 1. 개요 및 변경 목적
1. **제니트리 공식 로고 적용**:
   - 기존의 단순 박스 텍스트 `JT`를 사내 디자인 가이드라인(`JT_디자인시스템_Foundation_v1.0.md` §9 로고 & 브랜드 자산)에 명시된 **공식 J⁺ 심볼 마크 및 Janytree 워드마크 SVG**로 전면 교체합니다.
   - 상단바 헤더 규격(h형 28~32px)에 맞추어 다크/라이트 배경 어디서나 정밀하게 렌더링되도록 구현합니다.
2. **실제 Google Gemini AI API 연결**:
   - 규칙 기반 추정치 외에, **실제 최신 Google Gemini AI 모델**을 직접 호출하여 진짜 AI가 제품 사진과 텍스트를 정밀 분석하도록 연동합니다.
   - **이미지 업로드 분석 기능 추가**: 제품 라벨, 차량 계기판, 영수증, 가전제품 스티커 사진을 업로드하면 Gemini Multimodal(Vision) AI가 라벨 문자와 모델명을 자동으로 읽고 교체 주기를 진단합니다.
   - **API 키 관리 편의성 & 보안**:
     - `.env.local` 또는 서버 환경변수(`GEMINI_API_KEY`)를 지원하며,
     - 화면 상단에 **[API 설정] 버튼**을 두어 브라우저에서도 자신의 Gemini API Key를 간편하게 입력·저장할 수 있게 합니다.
     - 키가 등록되지 않았거나 일시적 통신 오류 시에도 기존의 내장 매뉴얼 DB가 자동 작동(Fallback)하여 앱이 절대 멈추지 않도록 안전망을 구축합니다.

---

## 2. 세부 구현 단계

### [단계 1] 제니트리 공식 로고(J⁺) 벡터 컴포넌트 (`app/components/ZenitreeLogo.tsx`)
- Foundation 문서 §9 기준 `mark (심볼 J⁺)` 및 `h (가로형 로고)` 정밀 SVG 벡터 제작
- 크기 및 비율 가이드 준수 (여백 50%, 28px 높이)

### [단계 2] Next.js 서버사이드 Gemini API 라우트 (`app/api/analyze/route.ts`)
- Cloudflare Pages / Edge 호환 fetch 기반 Google Gemini REST API 엔드포인트 구축
- 사용자 요청 JSON 스키마를 프롬프트에 주입하여 완벽한 구조화 JSON 데이터 반환
- 이미지(Base64)가 함께 들어올 경우 Gemini 1.5/2.0 Vision 모델로 자동 멀티모달 분석 수행

### [단계 3] UI 업그레이드 (`app/page.tsx`)
- 헤더에 제니트리 공식 `ZenitreeLogo` 컴포넌트 탑재
- 상단바에 **[🔑 Gemini API 설정]** 버튼 및 상태 표시 배지(API 활성화 / 로컬 엔진 모드) 추가
- 소모품 등록 모달에 **"📷 제품 라벨/계기판 사진 업로드 (AI 자동인식)"** 기능 추가
- 실제 Gemini AI 분석 로딩 스피너 및 브리핑 결과 연동

### [단계 4] 빌드 무결성 검증 (`npm run cf:build`)
- OpenNext Cloudflare 번들링 정상 여부 확인

---

## 3. 확인 및 승인 요청
남건, 위 계획대로 **제니트리 공식 J⁺ 로고 교체**와 **실제 Google Gemini API 실시간 연동** 작업을 진행해도 괜찮으실까요?
승인해 주시면 즉시 착수하겠습니다!
