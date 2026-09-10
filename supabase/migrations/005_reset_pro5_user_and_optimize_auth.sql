-- ============================================================
-- 005_reset_pro5_user_and_optimize_auth.sql
-- 역할: 수파베이스에 꼬여있는 pro5@janytree.com 계정 초기화 및 안전한 재가입 준비
-- ============================================================

-- 1. 꼬인 계정이 남아있다면 삭제하여 깨끗한 상태로 복원
DELETE FROM auth.users WHERE email = 'pro5@janytree.com';

-- 2. 해당 계정의 프로필 데이터 정리 (외래키 CASCADE가 있지만 확실히 정리)
DELETE FROM public.profiles WHERE email = 'pro5@janytree.com';