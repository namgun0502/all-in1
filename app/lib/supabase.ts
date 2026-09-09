// ============================================================================
// Supabase 클라이언트 단일 통합 운용 모듈
// (app/lib/supabase.ts)
// 남건 지정 단일 프로젝트 전용: https://qzhgsshyhmnczmreagqd.supabase.co
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * 프로젝트 단일 고정 Supabase 설정 상수
 * (남건 지정 공식 프로젝트로 단일화하여 모든 환경에서 일관되게 운용)
 */
export const DEFAULT_SUPABASE_URL = "https://qzhgsshyhmnczmreagqd.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6aGdzc2h5aG1uY3ptcmVhZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzc0NzksImV4cCI6MjA5Nzg1MzQ3OX0.2NZxyClmIpj7WtUuZtexZqAMuTnC7udF5FejwitzvcU";

/**
 * Supabase URL 스마트 정규화
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  if (!cleaned) return DEFAULT_SUPABASE_URL;

  try {
    const urlObj = new URL(cleaned);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return cleaned.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  }
}

/**
 * 공식 단일 Supabase 접속 정보 반환
 */
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const finalUrl = normalizeSupabaseUrl(envUrl || DEFAULT_SUPABASE_URL);
  const finalKey = (envKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url: finalUrl,
    anonKey: finalKey,
  };
}

/**
 * 단일 Supabase 클라이언트 인스턴스 (싱글톤)
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, anonKey } = getSupabaseCredentials();

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

/**
 * 항상 단일 프로젝트로 고정 운용되므로 항상 true
 */
export function isSupabaseConfigured(): boolean {
  return true;
}
