// ============================================================================
// 사용자 인증 및 비밀번호 암호화 모듈
// (app/lib/auth.ts)
// 규칙 8(강력한 보안 및 암호화) 준수: Supabase Auth & Web Crypto SHA-256 해싱
// ============================================================================

import { getSupabaseClient } from "./supabase";

export interface UserAccount {
  id?: string;
  email: string;
  passwordHash?: string;
  createdAt: string;
}

/**
 * UUID 형식 유효성 검사 (8-4-4-4-12 형태)
 */
export function isValidUuid(str: string | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * 비밀번호를 안전하게 SHA-256으로 단방향 암호화(해싱)하는 함수
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_zenitree_secure_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

const USERS_STORAGE_KEY = "zenitree_registered_users";
const SESSION_STORAGE_KEY = "zenitree_current_session";
const SESSION_USER_ID_KEY = "zenitree_current_user_id";

/**
 * 신규 회원가입 처리 (Supabase 우선 연동)
 */
export async function registerUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, message: "올바른 이메일 형식을 입력해 주세요." };
  }
  if (password.length < 6) {
    return { success: false, message: "비밀번호는 최소 6자리 이상이어야 합니다." };
  }

  // 1. Supabase 연동 시도
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        return { success: false, message: `[Supabase 가입 실패] ${error.message}` };
      }

      const userId = data.user?.id;
      if (userId) {
        localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        localStorage.setItem(SESSION_USER_ID_KEY, userId);
      }

      // Supabase에서 이메일 컨펌이 켜져 있는 경우 안내
      if (!data.session && data.user) {
        return {
          success: true,
          message: "가입 완료! (Supabase 이메일 인증이 켜져 있을 경우 메일함을 확인해 주세요)",
          userId,
        };
      }

      return {
        success: true,
        message: "회원가입 및 로그인이 완료되었습니다!",
        userId,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, message: `Supabase 연결 오류: ${error.message}` };
    }
  }

  // 2. Fallback: 로컬 스토리지 모드
  let users: UserAccount[] = [];
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    users = raw ? JSON.parse(raw) : [];
  } catch {
    users = [];
  }

  if (users.some((u) => u.email === cleanEmail)) {
    return { success: false, message: "이미 가입된 이메일 주소입니다. 로그인을 진행해 주세요." };
  }

  const passwordHash = await hashPassword(password);
  // 로컬 사용자도 UUID 형식과 호환되도록 표준 UUID v4 생성
  const cryptoUuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-000000000000";

  users.push({
    id: cryptoUuid,
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
  localStorage.setItem(SESSION_USER_ID_KEY, cryptoUuid);

  return { success: true, message: "회원가입이 완료되었습니다!", userId: cryptoUuid };
}

/**
 * 이메일 로그인 처리 (Supabase 우선 연동)
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Supabase 연동 시도
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        return { success: false, message: `[로그인 실패] ${error.message}` };
      }

      const userId = data.user?.id;
      if (userId) {
        localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        localStorage.setItem(SESSION_USER_ID_KEY, userId);
      }
      return { success: true, message: "로그인에 성공했습니다.", userId };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, message: `Supabase 통신 오류: ${error.message}` };
    }
  }

  // 2. Fallback: 로컬 스토리지 모드
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const users: UserAccount[] = raw ? JSON.parse(raw) : [];
    const user = users.find((u) => u.email === cleanEmail);

    if (!user) {
      return { success: false, message: "등록되지 않은 이메일입니다. 회원가입을 먼저 진행해 주세요." };
    }

    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      return { success: false, message: "비밀번호가 일치하지 않습니다. 다시 확인해 주세요." };
    }

    const cryptoUuid =
      user.id && isValidUuid(user.id)
        ? user.id
        : typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-000000000000";

    localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
    localStorage.setItem(SESSION_USER_ID_KEY, cryptoUuid);
    return { success: true, message: "로그인에 성공했습니다.", userId: cryptoUuid };
  } catch {
    return { success: false, message: "로그인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 현재 로그인된 세션 이메일 및 유저 ID 확인 (Supabase 실시간 세션 동기화 포함)
 */
export async function syncCurrentSession(): Promise<{ email: string | null; userId: string | null }> {
  if (typeof window === "undefined") return { email: null, userId: null };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        localStorage.setItem(SESSION_STORAGE_KEY, u.email || "");
        localStorage.setItem(SESSION_USER_ID_KEY, u.id);
        return { email: u.email || null, userId: u.id };
      }
    } catch (e) {
      console.warn("세션 동기화 확인:", e);
    }
  }

  let savedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
  // 이전 구버전의 "local-user-..." 형태가 남아있다면 유효한 UUID로 교체
  if (savedUserId && !isValidUuid(savedUserId)) {
    savedUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
    if (savedUserId) {
      localStorage.setItem(SESSION_USER_ID_KEY, savedUserId);
    }
  }

  return {
    email: localStorage.getItem(SESSION_STORAGE_KEY),
    userId: savedUserId,
  };
}

/**
 * 동기 방식 세션 확인
 */
export function getCurrentSession(): { email: string | null; userId: string | null } {
  if (typeof window === "undefined") return { email: null, userId: null };
  let savedUserId = localStorage.getItem(SESSION_USER_ID_KEY);

  if (savedUserId && !isValidUuid(savedUserId)) {
    savedUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
    if (savedUserId) {
      localStorage.setItem(SESSION_USER_ID_KEY, savedUserId);
    }
  }

  return {
    email: localStorage.getItem(SESSION_STORAGE_KEY),
    userId: savedUserId,
  };
}

/**
 * 로그아웃 처리
 */
export async function logoutUser(): Promise<void> {
  if (typeof window === "undefined") return;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase 로그아웃 알림:", e);
    }
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_USER_ID_KEY);
}
