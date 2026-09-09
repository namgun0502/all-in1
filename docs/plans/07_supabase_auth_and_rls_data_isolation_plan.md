# 07_Supabase 연동 및 계정별 데이터 격리(RLS) 구축 계획서

남건, 요청하신 **"Supabase 연동 및 로그인 계정별 고유 소모품 데이터 격리 관리"** 구축을 위한 상세 계획서입니다.

---

## 1. 개요 및 설계 원칙

### 1) Supabase Authentication (이메일 회원가입 및 로그인)
- 클라우드 데이터베이스인 **Supabase**의 정식 인증 시스템(`supabase.auth.signUp`, `supabase.auth.signInWithPassword`)을 연동합니다.
- 사용자가 이메일과 비밀번호로 로그인하면 Supabase에서 고유한 사용자 ID(`user.id` - UUID)를 발급합니다.

### 2) 사용자별 데이터 격리 및 강력한 보안 (RLS - Row Level Security)
- **규칙 8(보안 최우선)** 준수:
  - 데이터베이스 차원에서 `Row Level Security(RLS)`를 활성화합니다.
  - 소모품 테이블(`consumable_items`)에 `user_id` 외래키를 부여하여, **로그인한 본인의 데이터만 조회(SELECT), 등록(INSERT), 수정(UPDATE), 삭제(DELETE)**할 수 있도록 강력한 보안 정책을 적용합니다.
  - 타인의 소모품 데이터는 URL이나 API를 조작하더라도 절대 열람할 수 없도록 완벽 격리합니다.

### 3) 쿼리 관리 규칙 준수 (규칙 7)
- 모든 SQL 스크립트는 `supabase/migrations/` 전용 폴더에 보관하며, 번호 접두어를 부여합니다.
- 예: `supabase/migrations/001_create_consumables_schema_with_rls.sql`

### 4) 환경변수 및 오프라인 안전망 (Fallback)
- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 지원
- Supabase 계정이 아직 연결되기 전이거나 키가 비어있는 상태에서도 앱이 오류로 멈추지 않고 로컬 브라우저 격리 저장소 모드로 부드럽게 작동하도록 안전망을 함께 마련합니다.

---

## 2. 세부 구현 단계 (Step-by-Step)

### [단계 1] Supabase 클라이언트 패키지 설치
- `@supabase/supabase-js` 패키지 설치

### [단계 2] 규칙 7 준수 SQL 마이그레이션 파일 작성 (`supabase/migrations/`)
- `supabase/migrations/001_create_consumables_schema_with_rls.sql`
- `consumable_items` 테이블 정의 및 RLS 활성화 정책 작성

### [단계 3] Supabase 클라이언트 초기화 모듈 (`app/lib/supabase.ts`)
- 브라우저 및 서버리스 환경에서 안전하게 싱글톤 클라이언트를 생성하는 유틸리티 작성

### [단계 4] 인증 및 데이터 레이어 Supabase 연동 (`app/page.tsx`, `app/lib/auth.ts`)
- Supabase Auth를 통한 실시간 로그인/회원가입
- 로그인 성공 시 Supabase DB에서 해당 유저(`auth.uid()`)의 소모품 목록 실시간 fetch
- 소모품 등록/수정/삭제 시 Supabase DB 실시간 동기화

---

## 3. 확인 및 승인 요청
남건, 위 계획대로 **Supabase 연동 및 RLS 기반 계정별 데이터 완전 격리** 작업을 진행해도 괜찮으실까요?
승인해 주시면 1단계부터 차근차근 진행하겠습니다!
