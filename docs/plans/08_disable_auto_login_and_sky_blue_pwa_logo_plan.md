# 08_disable_auto_login_and_sky_blue_pwa_logo_plan.md

남건, 요청하신 세 가지 핵심 요구사항에 대한 구현 계획서입니다.
1. **자동 로그인 해제 (항상 첫 화면에서 로그인 창 진입)**
2. **Supabase 연동 상태 점검 및 클라우드 연동 완벽 보장**
3. **앱 설치(PWA) 시 로고를 세련된 '하늘색 제니트리 로고'로 표시**

---

## 1. 개요 및 변경 사항 분석

### 1) 자동 로그인 방지 및 항상 로그인 창 진입
- **현재 상황**: 페이지 진입 시 `syncCurrentSession()`을 통해 세션이 남아있으면 자동으로 대시보드로 진입하고 있었습니다.
- **개선 내용**: 
  - 페이지 로드 시 기존 세션으로 바로 대시보드 화면을 띄우지 않고, **항상 로그인/회원가입 폼이 먼저 나타나도록** 수정합니다.
  - 사용자가 이메일과 비밀번호를 명시적으로 입력하고 "로그인" 버튼을 눌렀을 때만 대시보드로 이동합니다.

### 2) Supabase 연동 점검 및 클라우드 동기화 완벽 보장
- **현재 상황**: 남건께서 등록하신 공식 프로젝트(`https://qzhgsshyhmnczmreagqd.supabase.co`)의 Anon Key가 설정되어 있으나, Supabase Auth 및 DB 테이블(`consumable_items`) 간의 통신에서 에러가 발생했을 때 로컬 스토리지에만 저장되어 Supabase 대시보드에 데이터가 안 보이는 문제가 발생할 수 있었습니다.
- **개선 내용**:
  - `loginUser` / `registerUser`에서 Supabase Auth 서버와 직접 통신하고 성공 여부를 확실하게 전달합니다.
  - 소모품 등록(`insert`), 조회(`select`), 삭제(`delete`), 교체완료(`update`) 시 Supabase API 호출 결과를 정밀 검증하고, 실패 시 친절하게 안내 문구를 노출하여 클라우드에 100% 정상 기록되도록 보장합니다.

### 3) 앱 설치 시 '하늘색 제니트리 로고' 적용
- **현재 상황**: `manifest.json`과 `app/layout.tsx`에 기본 검정색 먹색 로고(`logo-v.svg`)가 아이콘으로 지정되어 있었습니다.
- **개선 내용**:
  - 제니트리의 정품 심볼(J자 형태와 십자가 서브 심볼, 원형 마크)을 청량하고 산뜻한 **하늘색 / 스카이블루(`#38BDF8` & `#0284C7`)** 및 깔끔한 원형 앱 아이콘 SVG 자산(`public/brand/logo/logo-sky.svg`)으로 정밀 생성합니다.
  - `public/manifest.json` 및 `app/layout.tsx`의 아이콘 경로를 `logo-sky.svg`로 교체하여, 모바일/PC 홈 화면에 설치할 때 **하늘색 제니트리 로고**가 선명하게 표시되도록 설정합니다.

---

## 2. 세부 변경 파일 목록

1. **[NEW] `public/brand/logo/logo-sky.svg`**:
   - 제니트리 정품 벡터 심볼 기반의 프리미엄 하늘색(#38BDF8) 그라디언트 앱 아이콘 생성.
2. **[MODIFY] `public/manifest.json`**:
   - PWA 설치 아이콘을 `/brand/logo/logo-sky.svg`로 지정 및 테마 컬러를 하늘색 톤(#38BDF8)으로 최적화.
3. **[MODIFY] `app/layout.tsx`**:
   - 웹 브라우저 탭 파비콘 및 모바일 바로가기 아이콘을 `/brand/logo/logo-sky.svg`로 연동.
4. **[MODIFY] `app/page.tsx`**:
   - 페이지 로드시 자동 로그인(`initSession`) 비활성화 ➜ 첫 화면에서 항상 로그인 창 노출.
   - Supabase CRUD(등록/조회/삭제) 통신 실패 시 오류 안내 강화 및 데이터 무결성 보장.
5. **[MODIFY] `app/lib/auth.ts`**:
   - 자동 세션 복구 로직 분리 및 Supabase Auth 정식 로그인 우선 처리 강화.

---

## 3. 사용자 승인 요청
남건, 위 구현 계획대로 **자동 로그인 해제**, **Supabase 연동 강화**, **하늘색 제니트리 앱 설치 로고 적용**을 진행해도 괜찮으실까요?
승인해 주시면 즉시 안전하게 작업을 진행하겠습니다!
