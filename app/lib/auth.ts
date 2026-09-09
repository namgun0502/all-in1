// ============================================================================
// 사용자 인증 및 비밀번호 암호화 모듈
// (app/lib/auth.ts)
// 규칙 8(강력한 보안 및 암호화) 준수: Supabase Auth & Web Crypto SHA-256 해싱
// ============================================================================

import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export interface UserAccount {
  id?: string;
  email: string;
  passwordHash?: string;
  createdAt: string;
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
        return { success: false, message: `[Supabase 오류] ${error.message}` };
      }

      const userId = data.user?.id;
      if (userId) {
        localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        localStorage.setItem(SESSION_USER_ID_KEY, userId);
      }
      return {
        success: true,
        message: data.session ? "회원가입 및 로그인 완료!" : "가입 확인 이메일이 발송되었습니다. 확인 후 로그인해 주세요.",
        userId,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, message: `Supabase 연결 오류: ${error.message}` };
    }
  }

  // 2. Fallback: 로컬 스토리지 SHA-256 모드
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
  const userId = "local-user-" + Date.now();
  users.push({
    id: userId,
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
  localStorage.setItem(SESSION_USER_ID_KEY, userId);

  return { success: true, message: "회원가입이 완료되었습니다!", userId };
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

  // 2. Fallback: 로컬 스토리지 SHA-256 모드
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

    const userId = user.id || "local-user-" + Date.now();
    localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
    localStorage.setItem(SESSION_USER_ID_KEY, userId);
    return { success: true, message: "로그인에 성공했습니다.", userId };
  } catch {
    return { success: false, message: "로그인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 현재 로그인된 세션 이메일 및 유저 ID 확인
 */
export function getCurrentSession(): { email: string | null; userId: string | null } {
  if (typeof window === "undefined") return { email: null, userId: null };
  return {
    email: localStorage.getItem(SESSION_STORAGE_KEY),
    userId: localStorage.getItem(SESSION_USER_ID_KEY),
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
