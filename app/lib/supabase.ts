// ============================================================================
// Supabase 클라이언트 초기화 및 연결 관리 모듈
// (app/lib/supabase.ts)
// Cloudflare Pages / Workers 환경 호환 및 환경변수/로컬 키 듀얼 지원
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const STORAGE_SUPABASE_URL_KEY = "zenitree_supabase_url";
const STORAGE_SUPABASE_ANON_KEY = "zenitree_supabase_anon_key";

/**
 * 현재 설정된 Supabase URL 및 Anon Key 가져오기
 * 1) 브라우저 로컬 저장소 우선 (사용자가 직접 입력한 값)
 * 2) 환경변수(process.env.NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)
 */
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (typeof window !== "undefined") {
    const localUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY);
    const localKey = localStorage.getItem(STORAGE_SUPABASE_ANON_KEY);
    if (localUrl) url = localUrl;
    if (localKey) anonKey = localKey;
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

/**
 * Supabase 설정 여부 확인
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith("https://"));
}

/**
 * Supabase 클라이언트 인스턴스 반환
 */
let cachedClient: SupabaseClient | null = null;
let lastUrl = "";
let lastKey = "";

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || !url.startsWith("https://")) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error("Supabase 클라이언트 초기화 오류:", err);
    return null;
  }
}

/**
 * 사용자 입력 Supabase 연결 정보 저장
 */
export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === "undefined") return;
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (cleanUrl) {
    localStorage.setItem(STORAGE_SUPABASE_URL_KEY, cleanUrl);
  } else {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
  }

  if (cleanKey) {
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
  }

  // 캐시 리셋
  cachedClient = null;
  lastUrl = "";
  lastKey = "";
}
