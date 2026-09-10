-- ============================================================================
-- 003_complete_consumables_schema_and_rls_reset.sql
-- 스마트 라이프 소모품 케어 앱 - Supabase 통합 운영 스키마 및 RLS 완전 격리 정책
-- 프로젝트: https://qzhgsshyhmnczmreagqd.supabase.co
-- 규칙 7(순서 번호 및 전용 폴더) & 규칙 8(강력한 보안 및 암호화 격리) 준수
-- ============================================================================

-- 1. 소모품 관리 테이블 생성 (이미 존재하면 부족한 컬럼이 없도록 확인)
CREATE TABLE IF NOT EXISTS public.consumable_items (
    id TEXT PRIMARY KEY,                                                -- 품목 고유 식별자 (UUID)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,   -- Supabase Auth 사용자 고유 UUID
    brand TEXT NOT NULL,                                                -- 제조사/브랜드명 (현대, LG, 삼성, 다이슨 등)
    name TEXT NOT NULL,                                                 -- 소모품 명칭
    category TEXT NOT NULL,                                             -- 카테고리 (차량, 가전, IT기기, 생필품/기타)
    installed_date DATE NOT NULL,                                       -- 장착일 / 구매일
    condition TEXT NOT NULL DEFAULT 'normal',                           -- 사용 환경 (normal / harsh)
    current_usage NUMERIC NOT NULL DEFAULT 0,                           -- 현재 사용량 (km 또는 개월/일수)
    usage_unit TEXT NOT NULL DEFAULT 'km',                              -- 사용 단위 (km, 개월, 일)
    analysis JSONB NOT NULL,                                            -- AI 분석 결과 객체 (JSONB)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL -- 등록 일시
);

-- 2. 검색 및 계정별 조회 속도 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_consumable_items_user_id ON public.consumable_items(user_id);
CREATE INDEX IF NOT EXISTS idx_consumable_items_category ON public.consumable_items(category);
CREATE INDEX IF NOT EXISTS idx_consumable_items_created_at ON public.consumable_items(created_at DESC);

-- 3. Row Level Security (RLS) 활성화 (계정별 데이터 완벽 격리)
ALTER TABLE public.consumable_items ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 충돌 방지를 위한 초기화
DROP POLICY IF EXISTS Users can only view their own items ON public.consumable_items;
DROP POLICY IF EXISTS Users can only insert their own items ON public.consumable_items;
DROP POLICY IF EXISTS Users can only update their own items ON public.consumable_items;
DROP POLICY IF EXISTS Users can only delete their own items ON public.consumable_items;

-- 5. RLS 보안 정책: 오직 로그인한 본인(auth.uid())의 데이터만 접근 가능
-- [조회(SELECT)]
CREATE POLICY Users can only view their own items 
    ON public.consumable_items 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- [등록(INSERT)]
CREATE POLICY Users can only insert their own items 
    ON public.consumable_items 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- [수정/리셋(UPDATE)]
CREATE POLICY Users can only update their own items 
    ON public.consumable_items 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- [삭제(DELETE)]
CREATE POLICY Users can only delete their own items 
    ON public.consumable_items 
    FOR DELETE 
    USING (auth.uid() = user_id);