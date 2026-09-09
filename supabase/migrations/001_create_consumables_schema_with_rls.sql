-- ============================================================================
-- 001_create_consumables_schema_with_rls.sql
-- 스마트 라이프 소모품 케어 앱 - Supabase 데이터베이스 스키마 및 RLS 보안 정책
-- 규칙 7(순서 번호 및 전용 폴더 보관) 및 규칙 8(강력한 보안 및 암호화 격리) 준수
-- ============================================================================

-- 1. 소모품 테이블(consumable_items) 생성
CREATE TABLE IF NOT EXISTS public.consumable_items (
    id TEXT PRIMARY KEY,                                      -- 고유 품목 식별자 (UUID 등)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Supabase Auth 가입 유저 ID 외래키
    brand TEXT NOT NULL,                                      -- 제조사 (회사 / 브랜드명)
    name TEXT NOT NULL,                                       -- 소모품 명칭 (예: 엔진오일, HEPA 필터)
    category TEXT NOT NULL,                                   -- 카테고리 (차량, 가전, IT기기, 생필품/기타)
    installed_date DATE NOT NULL,                             -- 장착일 / 구매일 (YYYY-MM-DD)
    condition TEXT NOT NULL DEFAULT 'normal',                 -- 사용 환경 (normal / harsh)
    current_usage NUMERIC NOT NULL DEFAULT 0,                 -- 현재 사용량 (km 또는 개월/일수)
    usage_unit TEXT NOT NULL DEFAULT 'km',                    -- 단위 (km, 개월, 일)
    analysis JSONB NOT NULL,                                  -- AI 수명 분석 결과 객체 (JSON 구조)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL -- 등록 일시
);

-- 2. 검색 및 쿼리 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_consumable_items_user_id ON public.consumable_items(user_id);
CREATE INDEX IF NOT EXISTS idx_consumable_items_category ON public.consumable_items(category);

-- 3. [보안 최우선] Row Level Security (RLS) 활성화
-- 모든 데이터 접근에 대해 사용자별 보안 정책을 강제합니다.
ALTER TABLE public.consumable_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS 보안 정책 (Policy) 정의: 본인 데이터만 접근 허용

-- [조회 정책] 로그인한 사용자는 '오직 본인의 소모품 목록'만 조회할 수 있습니다.
CREATE POLICY "Users can only view their own items" 
    ON public.consumable_items 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- [추가 정책] 로그인한 사용자는 '본인의 user_id'로만 소모품을 등록할 수 있습니다.
CREATE POLICY "Users can only insert their own items" 
    ON public.consumable_items 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- [수정 정책] 로그인한 사용자는 '본인의 소모품'만 수명 리셋/수정할 수 있습니다.
CREATE POLICY "Users can only update their own items" 
    ON public.consumable_items 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- [삭제 정책] 로그인한 사용자는 '본인의 소모품'만 삭제할 수 있습니다.
CREATE POLICY "Users can only delete their own items" 
    ON public.consumable_items 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================================
-- 안내:
-- Supabase 대시보드(https://supabase.com/dashboard)의 [SQL Editor]에 접속하여
-- 위 쿼리 전체를 붙여넣고 [Run] 버튼을 누르시면 즉시 테이블과 보안 정책이 생성됩니다.
-- ============================================================================
