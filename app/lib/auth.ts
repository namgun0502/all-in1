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
 * - 가입 성공 후 세션이 없으면 자동으로 로그인 시도
 * - 이미 가입된 계정이면 자동으로 로그인 전환
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
  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      // 이미 가입된 계정이면 -> 자동으로 로그인 시도
      if (
        error.message.includes("User already registered") ||
        error.message.includes("already registered")
      ) {
        const loginResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });
        if (!loginResult.error && loginResult.data.user) {
          const userId = loginResult.data.user.id;
          localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
          localStorage.setItem(SESSION_USER_ID_KEY, userId);
          return {
            success: true,
            message: "이미 가입된 계정으로 자동 로그인되었습니다!",
            userId,
          };
        }
        // 로그인도 실패하면 (비밀번호 불일치 등) 로그인 화면으로 안내
        return {
          success: false,
          message: "이미 가입되어 있는 이메일입니다. 아래 '로그인하기' 버튼을 눌러주세요.",
        };
      }
      // 비밀번호 조건 미충족
      if (error.message.includes("Password should be at least")) {
        return { success: false, message: "비밀번호는 최소 6자리 이상이어야 합니다." };
      }
      return { success: false, message: `가입 오류: ${error.message}` };
    }

    const userId = data.user?.id;

    // 세션이 없으면 (이메일 확인 설정 등) -> 바로 로그인 시도
    if (!data.session && data.user) {
      const loginResult = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });
      if (!loginResult.error && loginResult.data.user) {
        const loggedInUserId = loginResult.data.user.id;
        localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        localStorage.setItem(SESSION_USER_ID_KEY, loggedInUserId);
        return {
          success: true,
          message: "회원가입 및 로그인이 완료되었습니다!",
          userId: loggedInUserId,
        };
      }
    }

    // 정상 가입 완료 (세션 있음)
    if (userId) {
      localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
      localStorage.setItem(SESSION_USER_ID_KEY, userId);
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
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      let friendlyMsg = error.message;
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        friendlyMsg =
          "이메일 또는 비밀번호가 올바르지 않습니다.\n계정이 없으시면 아래 '회원가입하기'를 눌러주세요!";
      } else if (error.message.includes("Email not confirmed")) {
        friendlyMsg =
          "이메일 인증이 완료되지 않았습니다.\nSupabase 대시보드 → Authentication → Email → Confirm email 을 OFF로 변경해 주세요.";
      }
      return { success: false, message: friendlyMsg };
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

/**
 * 현재 로그인된 세션 이메일 및 유저 ID 확인 (Supabase 실시간 세션 동기화 포함)
 */
export async function syncCurrentSession(): Promise<{ email: string | null; userId: string | null }> {
  if (typeof window === "undefined") return { email: null, userId: null };

  const supabase = getSupabaseClient();
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

  let savedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
  if (savedUserId && !isValidUuid(savedUserId)) {
    savedUserId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
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
    savedUserId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
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
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn("Supabase 로그아웃 알림:", e);
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_USER_ID_KEY);
}