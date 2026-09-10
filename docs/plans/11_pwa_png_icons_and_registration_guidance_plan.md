# 11_pwa_png_icons_and_registration_guidance_walkthrough.md

남건, **"User already registered 에러 안내 및 즉시 로그인 전환"**과 **"브라우저 PWA 필수 규격 PNG 192/512 아이콘을 통한 즉시 설치 활성화"** 작업이 모두 완료되었습니다.

---

## 1. 수행한 작업 상세

### 1) `[Supabase 가입 실패] User already registered` 해결
- **원인**: 이미 Supabase에 계정이 생성되어 있는데 회원가입을 다시 시도하셨을 때 발생하는 영문 알림이었습니다.
- **해결 조치**:
  - `app/lib/auth.ts`: 영문 에러를 **"이미 가입되어 있는 이메일 계정입니다! 아래 '로그인하기' 버튼을 눌러 로그인해 주세요."**라는 친절한 한글 안내로 변경했습니다.
  - `app/page.tsx`: 에러 메시지 상자 바로 아래에 **[👉 이미 가입된 계정으로 '로그인하기']** 버튼을 추가하여 클릭 한 번으로 바로 로그인 모드로 전환되도록 개선했습니다.

### 2) 앱 설치가 안 되던 브라우저 규격 문제 해결 (PNG 아이콘 탑재)
- **원인**: 크롬, 엣지, 안드로이드 등 대부분의 현대 웹 브라우저는 SVG뿐만 아니라 **192x192 픽셀 및 512x512 픽셀의 실제 PNG 규격 아이콘**이 `manifest.json`에 선언되어 있어야만 스마트폰과 PC에 앱 설치 프롬프트 창을 띄웁니다.
- **해결 조치**:
  - `public/brand/logo/icon-192.png`: 제니트리 하늘색 공식 브랜드 컬러 192x192 PNG 생성.
  - `public/brand/logo/icon-512.png`: 제니트리 하늘색 공식 브랜드 컬러 512x512 PNG 생성.
  - `public/manifest.json`: 브라우저 PWA 설치 심사를 100% 통과하도록 PNG 아이콘 2종을 정식 등록 완료.

### 3) Supabase 최신 통합 SQL 쿼리 관리 (규칙 7)
- `supabase/migrations/003_complete_consumables_schema_and_rls_reset.sql` 저장 완료.

---

## 2. 검증 결과
- **OpenNext Cloudflare 빌드 검증 (`npm run cf:build`)**: **성공 (Exit Code 0)**
- 변경 및 추가 파일 목록:
  - `app/lib/auth.ts`
  - `app/page.tsx`
  - `public/manifest.json`
  - `public/brand/logo/icon-192.png`
  - `public/brand/logo/icon-512.png`
  - `supabase/migrations/003_complete_consumables_schema_and_rls_reset.sql`
  - `docs/plans/11_pwa_png_icons_and_registration_guidance_plan.md` (규칙 12 영구 보존)
