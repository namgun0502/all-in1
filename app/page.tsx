"use client";

// ============================================================================
// 제니트리 스마트 라이프 소모품 케어 AI 앱 (app/page.tsx)
// - UUID 유효성 검증 및 Supabase Auth 실시간 세션 동기화 (UUID 오류 해결)
// - 텍스트 드래그 시 모달 꺼짐 방지(Backdrop Drag Protection) 완벽 적용
// - 단일 Supabase 프로젝트 고정 운용 (https://qzhgsshyhmnczmreagqd.supabase.co)
// - RLS(Row Level Security) 기반 계정별 데이터 완전 격리
// - 이메일 회원가입 및 로그인 (비밀번호 첫 글자 실시간 힌트)
// - 제니트리 공식 정품 로고(J⁺ Janytree) 탑재
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import ZenitreeLogo from "./components/ZenitreeLogo";
import {
  ConsumableItem,
  ItemCategory,
  UsageCondition,
  CareAnalysisResult,
} from "./types";
import {
  BRAND_PRESETS,
  analyzeConsumableItem,
} from "./lib/care-ai";
import {
  loginUser,
  registerUser,
  getCurrentSession,
  syncCurrentSession,
  logoutUser,
  isValidUuid,
} from "./lib/auth";
import {
  getSupabaseClient,
  DEFAULT_SUPABASE_URL,
} from "./lib/supabase";

// PWA 설치 프롬프트 인터페이스
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SmartLifeCarePage() {
  // ── 1. 인증(Auth) 상태 ──
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // ── 2. PWA 앱 설치 이벤트 상태 ──
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installToast, setInstallToast] = useState<string | null>(null);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState<boolean>(false);

  // ── 3. 소모품 목록 및 대시보드 상태 ──
  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [activeDetailItem, setActiveDetailItem] = useState<ConsumableItem | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);

  // 모달 내부 텍스트 드래그 시 창 꺼짐 방지용 Ref
  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  // Gemini API Key 및 실시간 분석 로딩
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [tempApiKey, setTempApiKey] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // 이미지 첨부 관련 상태
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 신규 등록 폼 상태
  const [formData, setFormData] = useState({
    brand: "현대/기아",
    category: "차량" as ItemCategory,
    itemName: "엔진오일 및 오일필터",
    installedDate: new Date().toISOString().split("T")[0],
    currentUsage: 0,
    condition: "normal" as UsageCondition,
  });

  // ── 4. 초기화 및 세션 / PWA 이벤트 감지 ──
  useEffect(() => {
    // 1) 자동 로그인 비활성화
    setCurrentUser(null);
    setCurrentUserId(null);

    // 2) Gemini API Key 로드
    const savedKey = localStorage.getItem("zenitree_gemini_key");
    if (savedKey) {
      setGeminiApiKey(savedKey);
      setTempApiKey(savedKey);
    }

    // 3) 이미 기기에 설치된 앱(Standalone 모드)인지 정밀 감지
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsAlreadyInstalled(true);
      }
    }

    // 4) PWA 설치 이벤트 등록 (layout.tsx 인라인 스크립트와 함께 이중 캡처)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(prompt);
      (window as any).__deferredInstallPrompt = prompt;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5) 이미 캡처된 전역 변수 즉시 동기화
    if ((window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
    }

    // 6) 폴링: 최대 60초 동안 1초마다 전역 변수 및 설치 상태 확인
    let pollCount = 0;
    const pollTimer = setInterval(() => {
      pollCount++;
      if (typeof window !== "undefined") {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true;
        if (isStandalone) {
          setIsAlreadyInstalled(true);
        }
      }
      if ((window as any).__deferredInstallPrompt) {
        setDeferredPrompt((window as any).__deferredInstallPrompt);
        clearInterval(pollTimer);
      }
      if (pollCount >= 60) clearInterval(pollTimer);
    }, 1000);

    // 7) PWA 서비스워커 등록
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker 등록 알림:", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearInterval(pollTimer);
    };
  }, []);

  // ── 5. 단일 Supabase에서 본인(RLS) 소모품 목록 불러오기 ──
  const loadUserItems = async (userId: string | null) => {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from("consumable_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped: ConsumableItem[] = data.map((row: any) => ({
          id: row.id,
          brand: row.brand,
          name: row.name,
          category: row.category as ItemCategory,
          installedDate: row.installed_date,
          condition: row.condition as UsageCondition,
          currentUsage: Number(row.current_usage),
          usageUnit: row.usage_unit as any,
          analysis: row.analysis,
          createdAt: row.created_at,
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Supabase 통신 오류:", err);
      setItems([]);
    }
  };

  // ── 6. 드래그 방지 모달 닫기 헬퍼 함수 ──
  const handleModalCloseSafely = (
    e: React.MouseEvent<HTMLDivElement>,
    closeCallback: () => void
  ) => {
    if (
      backdropMouseDownTarget.current === e.currentTarget &&
      e.target === e.currentTarget
    ) {
      closeCallback();
    }
    backdropMouseDownTarget.current = null;
  };

  // ── 7. PWA 앱 즉시 설치 트리거 ──
  const handleInstallApp = async () => {
    if (isAlreadyInstalled) {
      setInstallToast("✅ 현재 기기에 이미 전용 앱으로 설치되어 실행 중입니다!");
      setTimeout(() => setInstallToast(null), 3000);
      return;
    }

    // React 상태와 전역 변수 둘 다 확인
    const prompt =
      deferredPrompt ||
      (typeof window !== "undefined"
        ? (window as any).__deferredInstallPrompt
        : null);

    if (prompt) {
      // 설치 프롬프트가 있으면 → 브라우저 자체 설치 팝업 바로 실행
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
          if (typeof window !== "undefined") {
            (window as any).__deferredInstallPrompt = null;
          }
          setIsAlreadyInstalled(true);
          setInstallToast("🎉 앱 설치가 완료되었습니다! 홈 화면/바탕화면에서 실행하세요.");
          setTimeout(() => setInstallToast(null), 4000);
        }
      } catch (err) {
        console.warn("설치 프롬프트 실행:", err);
      }
    } else {
      // 아직 브라우저 준비 중인 경우 -> alert 없이 하단 1초 스낵바로만 알림
      setInstallToast("브라우저에서 설치 준비 중입니다. 잠시 후 다시 눌러주세요.");
      setTimeout(() => setInstallToast(null), 2500);
    }
  };

  // ── 7-1. Windows 바탕화면 바로가기(.url) 원클릭 생성 헬퍼 ──
  const handleCreateDesktopShortcut = () => {
    if (typeof window === "undefined") return;
    const currentOrigin = window.location.origin;
    // 윈도우 표준 인터넷 바로가기 파일 포맷
    const shortcutContent = `[InternetShortcut]\r\nURL=${currentOrigin}/\r\nIconIndex=0\r\nIconFile=${currentOrigin}/brand/logo/logo-sky.svg\r\n`;
    const blob = new Blob([shortcutContent], { type: "application/x-mswinurl;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "제니트리 스마트케어.url";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setInstallToast("🖥️ 바탕화면 바로가기 파일이 다운로드되었습니다! 바탕화면에 끌어다 놓으시면 됩니다.");
    setTimeout(() => setInstallToast(null), 4500);
  };

  // ── 8. 회원가입 및 로그인 핸들러 ──
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      if (authMode === "register") {
        const res = await registerUser(authEmail, authPassword);
        if (res.success) {
          const cleanEmail = authEmail.trim().toLowerCase();
          setCurrentUser(cleanEmail);
          setCurrentUserId(res.userId || null);
          await loadUserItems(res.userId || null);
        } else {
          setAuthError(res.message);
        }
      } else {
        const res = await loginUser(authEmail, authPassword);
        if (res.success) {
          const cleanEmail = authEmail.trim().toLowerCase();
          setCurrentUser(cleanEmail);
          setCurrentUserId(res.userId || null);
          await loadUserItems(res.userId || null);
        } else {
          setAuthError(res.message);
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await logoutUser();
      setCurrentUser(null);
      setCurrentUserId(null);
      setAuthPassword("");
      setItems([]);
    }
  };

  // ── 9. Gemini 설정 핸들러 ──
  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setGeminiApiKey(trimmed);
    localStorage.setItem("zenitree_gemini_key", trimmed);
    setIsApiKeyModalOpen(false);
    alert(trimmed ? "Google Gemini API 키가 저장되었습니다." : "API 키가 삭제되었습니다.");
  };

  // ── 10. 이미지 업로드 처리 ──
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("이미지 크기는 최대 4MB까지 지원됩니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const commaIndex = result.indexOf(",");
      if (commaIndex !== -1) {
        setImageBase64(result.slice(commaIndex + 1));
        setImageMimeType(file.type || "image/jpeg");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ── 11. 소모품 신규 등록 (UUID 안전성 검증 포함) ──
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim() || !currentUser) {
      alert("소모품명을 입력해주세요.");
      return;
    }

    setIsAiLoading(true);
    let finalAnalysis: CareAnalysisResult;

    if (geminiApiKey) {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: geminiApiKey,
            brand: formData.brand,
            category: formData.category,
            itemName: formData.itemName,
            installedDate: formData.installedDate,
            currentUsage: Number(formData.currentUsage) || 0,
            condition: formData.condition,
            imageBase64: imageBase64,
            imageMimeType: imageMimeType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          finalAnalysis = data.analysis;
        } else {
          finalAnalysis = analyzeConsumableItem({
            category: formData.category,
            brand: formData.brand,
            itemName: formData.itemName,
            installedDate: formData.installedDate,
            currentUsage: Number(formData.currentUsage) || 0,
            condition: formData.condition,
          });
        }
      } catch {
        finalAnalysis = analyzeConsumableItem({
          category: formData.category,
          brand: formData.brand,
          itemName: formData.itemName,
          installedDate: formData.installedDate,
          currentUsage: Number(formData.currentUsage) || 0,
          condition: formData.condition,
        });
      }
    } else {
      finalAnalysis = analyzeConsumableItem({
        category: formData.category,
        brand: formData.brand,
        itemName: formData.itemName,
        installedDate: formData.installedDate,
        currentUsage: Number(formData.currentUsage) || 0,
        condition: formData.condition,
      });
    }

    // 고유 ID는 표준 UUID v4 형식 생성
    const newItemId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "item-" + Date.now();

    const newItem: ConsumableItem = {
      id: newItemId,
      brand: formData.brand.trim() || "기타/표준",
      name: formData.itemName.trim(),
      category: formData.category,
      installedDate: formData.installedDate,
      condition: formData.condition,
      currentUsage: Number(formData.currentUsage) || 0,
      usageUnit: formData.category === "차량" ? "km" : "개월",
      analysis: finalAnalysis,
      createdAt: new Date().toISOString(),
    };

    // ── Supabase DB 저장 (UUID 검증을 통해 syntax 에러 방어) ──
    const supabase = getSupabaseClient();
    let targetUserId = currentUserId;

    // 만약 targetUserId가 유효한 UUID가 아니라면 현재 Supabase 세션에서 재확인
    if (!isValidUuid(targetUserId)) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) {
          targetUserId = data.user.id;
          setCurrentUserId(targetUserId);
        }
      } catch (e) {
        console.warn("유저 정보 재취득:", e);
      }
    }

    // 유효한 UUID일 때만 Supabase DB에 저장 시도
    if (isValidUuid(targetUserId)) {
      try {
        const { error } = await supabase.from("consumable_items").insert({
          id: newItemId,
          user_id: targetUserId,
          brand: newItem.brand,
          name: newItem.name,
          category: newItem.category,
          installed_date: newItem.installedDate,
          condition: newItem.condition,
          current_usage: newItem.currentUsage,
          usage_unit: newItem.usageUnit,
          analysis: newItem.analysis,
        });

        if (error) {
          console.error("Supabase 저장 오류:", error.message);
          alert(`[Supabase 클라우드 저장 안내]\n${error.message}\n\n(참고: Supabase RLS 정책 및 세션을 점검해 주세요)`);
        }
      } catch (err: any) {
        console.error("Supabase INSERT 예외:", err);
        alert(`[Supabase 통신 오류]\n${err?.message || "네트워크 연결을 확인해 주세요."}`);
      }
    } else {
      alert("로그인 세션(UUID)을 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    setItems([newItem, ...items]);
    setIsAiLoading(false);
    setIsModalOpen(false);
    handleClearImage();

    // 폼 초기화
    setFormData({
      brand: "현대/기아",
      category: "차량",
      itemName: "엔진오일 및 오일필터",
      installedDate: new Date().toISOString().split("T")[0],
      currentUsage: 0,
      condition: "normal",
    });
  };

  // ── 12. 교체 완료 ──
  const handleResetItem = async (id: string) => {
    if (!currentUser) return;
    const target = items.find((i) => i.id === id);
    if (!target) return;

    if (!confirm(`'${target.name}'을(를) 새 제품으로 교체 완료 처리할까요? 수명이 100%로 재설정됩니다.`)) {
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const newAnalysis = analyzeConsumableItem({
      category: target.category,
      brand: target.brand,
      itemName: target.name,
      installedDate: todayStr,
      currentUsage: 0,
      condition: target.condition,
    });

    const supabase = getSupabaseClient();
    try {
      await supabase
        .from("consumable_items")
        .update({
          installed_date: todayStr,
          current_usage: 0,
          analysis: newAnalysis,
        })
        .eq("id", id);
    } catch (err) {
      console.error("Supabase UPDATE 오류:", err);
    }

    const updated = items.map((i) => {
      if (i.id === id) {
        return {
          ...i,
          installedDate: todayStr,
          currentUsage: 0,
          analysis: newAnalysis,
        };
      }
      return i;
    });

    setItems(updated);
    if (activeDetailItem?.id === id) {
      setActiveDetailItem({
        ...target,
        installedDate: todayStr,
        currentUsage: 0,
        analysis: newAnalysis,
      });
    }
  };

  // ── 13. 삭제 ──
  const handleDeleteItem = async (id: string, name: string) => {
    if (!currentUser) return;
    if (!confirm(`'${name}' 소모품을 목록에서 삭제하시겠습니까?`)) {
      return;
    }

    const supabase = getSupabaseClient();
    try {
      await supabase.from("consumable_items").delete().eq("id", id);
    } catch (err) {
      console.error("Supabase DELETE 오류:", err);
    }

    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (activeDetailItem?.id === id) {
      setActiveDetailItem(null);
    }
  };

  // 필터 및 통계
  const filteredItems = items.filter((item) => {
    if (selectedCategory === "전체") return true;
    return item.category === selectedCategory;
  });

  const totalCount = items.length;
  const goodCount = items.filter((i) => i.analysis.replacement_analysis.status === "GOOD").length;
  const cautionCount = items.filter((i) => i.analysis.replacement_analysis.status === "CAUTION").length;
  const replaceNowCount = items.filter((i) => i.analysis.replacement_analysis.status === "REPLACE_NOW").length;

  const getStatusColor = (status: string) => {
    if (status === "GOOD") return "var(--seed-color-success)";
    if (status === "CAUTION") return "var(--seed-color-warning)";
    return "var(--seed-color-error)";
  };

  // ==========================================================================
  // [A] 로그인하지 않은 경우 ➜ 제니트리 Auth 화면 + 하단 앱 설치 버튼
  // ==========================================================================
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#F6F8FA",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        <div
          className="jt-card"
          style={{
            maxWidth: "420px",
            width: "100%",
            padding: "36px 32px",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* 제니트리 정품 공식 로고 (세로형) */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "center" }}>
            <ZenitreeLogo height={52} theme="light" variant="v" />
          </div>

          <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#1F2328", marginBottom: "6px" }}>
            스마트 라이프 소모품 케어 AI
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px" }}>
            {authMode === "login"
              ? "이메일 계정으로 로그인하여 나만의 소모품을 관리하세요."
              : "간편 이메일 회원가입으로 계정별 전용 자산을 보호하세요."}
          </p>

          {/* 에러 메시지 및 간편 회원가입 전환 안내 */}
          {authError && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "12px",
                marginBottom: "16px",
                textAlign: "left",
                lineHeight: "1.5",
              }}
            >
              <div>{authError}</div>
              {authMode === "login" ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#305CDE",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  👉 지금 바로 &apos;회원가입하기&apos;로 전환
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    padding: "6px 10px",
                    backgroundColor: "#0284C7",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  👉 이미 가입된 계정으로 &apos;로그인하기&apos;
                </button>
              )}
            </div>
          )}

          {/* 로그인 / 회원가입 폼 */}
          <form onSubmit={handleAuthSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                이메일 주소
              </label>
              <input
                type="email"
                className="jt-input font-num"
                placeholder="name@company.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                비밀번호 (6자리 이상)
              </label>
              <input
                type="password"
                className="jt-input font-num"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />

              {/* 비밀번호 첫 글자 안내 힌트 */}
              {authPassword.length > 0 ? (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#305CDE",
                    backgroundColor: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    💡 비밀번호 첫 글자:{" "}
                    <strong style={{ fontSize: "14px", color: "#1E3A8A", textDecoration: "underline" }}>
                      &apos;{authPassword.charAt(0)}&apos;
                    </strong>
                  </span>
                  <span style={{ fontSize: "11px", color: "#6B7280" }}>
                    ({authPassword.length}자리 입력 중)
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: "4px", fontSize: "11px", color: "#9CA3AF" }}>
                  비밀번호를 입력하시면 첫 글자를 바로 확인하실 수 있습니다.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="jt-btn-primary"
              style={{ width: "100%", padding: "10px", fontSize: "14px" }}
              disabled={isAuthLoading}
            >
              {isAuthLoading ? "처리 중..." : authMode === "login" ? "이메일 로그인" : "회원가입 완료"}
            </button>
          </form>

          {/* 전환 링크 */}
          <div style={{ marginTop: "18px", fontSize: "13px", color: "#6B7280" }}>
            {authMode === "login" ? (
              <>
                계정이 없으신가요?{" "}
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#305CDE",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  회원가입하기
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#305CDE",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  로그인하기
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 그 아래에 앱 설치 및 바탕화면 바로가기 버튼 ── */}
        <div style={{ maxWidth: "420px", width: "100%", marginTop: "16px", textAlign: "center" }}>
          {isAlreadyInstalled ? (
            <div>
              <div
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  backgroundColor: "#F0FDF4",
                  color: "#15803D",
                  border: "1.5px solid #86EFAC",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 6px rgba(34, 197, 94, 0.1)",
                }}
              >
                <span style={{ fontSize: "18px" }}>✅</span>
                현재 기기에 전용 앱으로 설치되어 실행 중입니다
              </div>

              {/* 바탕화면 아이콘 추가 보조 버튼 */}
              <button
                onClick={handleCreateDesktopShortcut}
                type="button"
                style={{
                  marginTop: "8px",
                  width: "100%",
                  padding: "9px 14px",
                  backgroundColor: "#FFFFFF",
                  color: "#0369A1",
                  border: "1px dashed #38BDF8",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
              >
                <span>🖥️</span>
                바탕화면에 바로가기 아이콘 1초 추가하기
              </button>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px" }}>
                바탕화면에 아이콘이 안 보이시면 위 버튼을 눌러 바탕화면에 바로 놓으실 수 있습니다.
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={handleInstallApp}
                type="button"
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  backgroundColor: "#FFFFFF",
                  color: "#0369A1",
                  border: "1.5px solid #38BDF8",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(56, 189, 248, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "18px" }}>📲</span>
                스마트폰 / PC에 앱 바로 설치하기
              </button>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px" }}>
                설치 시 윈도우 바탕화면 및 홈 화면에 앱 아이콘이 바로 추가됩니다.
              </div>

              {/* 브라우저 설치 팝업 없이 바로가기 파일만 바로 받고 싶을 때를 위한 옵션 */}
              <button
                onClick={handleCreateDesktopShortcut}
                type="button"
                style={{
                  marginTop: "6px",
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                🖥️ 또는 PC 바탕화면 바로가기 파일 즉시 다운로드
              </button>
            </div>
          )}
        </div>

        {/* 심플한 즉시 설치 안내 토스트 (복잡한 팝업 모달 대신 깔끔한 1줄 알림) */}
        {installToast && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#1F2328",
              color: "#FFFFFF",
              padding: "12px 20px",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              fontSize: "13px",
              fontWeight: "600",
              zIndex: 300,
              maxWidth: "90%",
              textAlign: "center",
              border: "1px solid #38BDF8",
            }}
          >
            {installToast}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // [B] 로그인된 경우 ➜ 제니트리 소모품 케어 메인 대시보드
  // ==========================================================================
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-base)" }}>
      {/* ── 상단 헤더 (제니트리 탑 바) ── */}
      <header
        style={{
          backgroundColor: "#1F2328",
          color: "#FFFFFF",
          borderBottom: "1px solid #33383F",
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* 제니트리 진짜 공식 로고 (가로형) */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ZenitreeLogo height={30} theme="dark" variant="h" />
            <div
              style={{
                width: "1px",
                height: "20px",
                backgroundColor: "#374151",
                margin: "0 4px",
              }}
            />
            <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
              스마트 라이프 케어 AI
            </div>
          </div>

          {/* 우측 세션 및 앱 설치 & 등록 버튼 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* 앱 설치 버튼 (아직 미설치된 브라우저 환경에서만 노출) */}
            {!isAlreadyInstalled && (
              <button
                onClick={handleInstallApp}
                type="button"
                style={{
                  fontSize: "12px",
                  backgroundColor: "#2B313A",
                  color: "#FFFFFF",
                  border: "1px solid #4B5563",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                📲 앱 설치
              </button>
            )}

            {/* Gemini API 버튼 */}
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              style={{
                fontSize: "12px",
                backgroundColor: geminiApiKey ? "#163828" : "#2B313A",
                color: geminiApiKey ? "#34D399" : "#D1D5DB",
                border: geminiApiKey ? "1px solid #059669" : "1px solid #4B5563",
                padding: "5px 10px",
                borderRadius: "6px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: geminiApiKey ? "#10B981" : "#9CA3AF",
                }}
              />
              {geminiApiKey ? "Gemini AI 연동됨" : "🔑 Gemini API 설정"}
            </button>

            {/* 사용자 계정 정보 및 로그아웃 */}
            <div
              style={{
                fontSize: "12px",
                color: "#D1D5DB",
                backgroundColor: "#2B313A",
                padding: "5px 10px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{currentUser}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  fontSize: "11px",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                로그아웃
              </button>
            </div>

            {/* 신규 등록 버튼 */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="jt-btn-accent"
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              + 소모품 등록 & AI 분석
            </button>
          </div>
        </div>
      </header>

      {/* ── 메인 대시보드 ── */}
      <main className="jt-container">
        {/* ── 1. 대시보드 KPI 요약 카드 ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div className="jt-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              내 관리 품목
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2328" }} className="font-num">
              {totalCount} <span style={{ fontSize: "14px", fontWeight: "500" }}>개</span>
            </div>
          </div>

          <div className="jt-card" style={{ padding: "20px", borderLeft: "4px solid #14A870" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              수명 양호 (GOOD)
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#14A870" }} className="font-num">
              {goodCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#1F2328" }}>개</span>
            </div>
          </div>

          <div className="jt-card" style={{ padding: "20px", borderLeft: "4px solid #F0B01C" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              점검 권장 (CAUTION)
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#B45309" }} className="font-num">
              {cautionCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#1F2328" }}>개</span>
            </div>
          </div>

          <div
            className="jt-card"
            style={{
              padding: "20px",
              borderLeft: "4px solid #E14B4B",
              backgroundColor: replaceNowCount > 0 ? "#FFF5F5" : "#FFFFFF",
            }}
          >
            <div style={{ fontSize: "13px", color: "#E14B4B", fontWeight: "600", marginBottom: "4px" }}>
              즉시 교체 필요 (REPLACE)
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#E14B4B" }} className="font-num">
              {replaceNowCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#1F2328" }}>개</span>
            </div>
          </div>
        </section>

        {/* ── 2. 카테고리 필터 탭 ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
            borderBottom: "1px solid var(--color-border-subtle)",
            paddingBottom: "12px",
            overflowX: "auto",
          }}
        >
          {["전체", "차량", "가전", "IT기기", "생필품/기타"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: selectedCategory === cat ? "700" : "500",
                backgroundColor: selectedCategory === cat ? "#1F2328" : "#FFFFFF",
                color: selectedCategory === cat ? "#FFFFFF" : "#4B5563",
                cursor: "pointer",
                boxShadow: selectedCategory === cat ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── 3. 소모품 카드 그리드 ── */}
        {filteredItems.length === 0 ? (
          <div
            className="jt-card"
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            <p style={{ fontSize: "15px", marginBottom: "12px" }}>등록된 소모품이 없습니다.</p>
            <button onClick={() => setIsModalOpen(true)} className="jt-btn-primary">
              소모품 첫 등록하기
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredItems.map((item) => {
              const { analysis } = item;
              const remaining = analysis.replacement_analysis.remaining_life_percent;
              const status = analysis.replacement_analysis.status;
              const barColor = getStatusColor(status);

              return (
                <div
                  key={item.id}
                  className="jt-card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <span className="jt-badge jt-badge-brand">
                        {analysis.item_identification.brand_applied || item.brand}
                        {analysis.item_identification.is_brand_official && " 공식규격"}
                      </span>

                      {status === "GOOD" && <span className="jt-badge jt-badge-good">● 양호</span>}
                      {status === "CAUTION" && <span className="jt-badge jt-badge-caution">▲ 점검주의</span>}
                      {status === "REPLACE_NOW" && <span className="jt-badge jt-badge-danger">! 즉시교체</span>}
                    </div>

                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "var(--color-text-title)",
                        marginBottom: "6px",
                      }}
                    >
                      {item.name}
                    </h3>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
                      분류: {item.category} · 조건: {item.condition === "harsh" ? "가혹 주행/가동" : "일반 환경"}
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12px",
                          fontWeight: "600",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ color: "var(--color-text-sub)" }}>잔여 수명</span>
                        <span style={{ color: barColor }} className="font-num">
                          {remaining}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          backgroundColor: "#E5E7EB",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${remaining}%`,
                            height: "100%",
                            backgroundColor: barColor,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: "#F9FAFB",
                        borderRadius: "6px",
                        padding: "10px 12px",
                        fontSize: "12px",
                        lineHeight: "1.7",
                        color: "var(--color-text-sub)",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <strong>현재 사용량:</strong>{" "}
                        <span className="font-num">{analysis.item_identification.current_mileage_or_usage}</span>
                      </div>
                      <div>
                        <strong>권장 교체주기:</strong> {analysis.replacement_analysis.recommended_interval}
                      </div>
                      <div>
                        <strong>예상 교체일:</strong>{" "}
                        <span style={{ color: "#1F2328", fontWeight: "600" }} className="font-num">
                          {analysis.replacement_analysis.estimated_next_date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      borderTop: "1px solid var(--color-border-subtle)",
                      paddingTop: "12px",
                    }}
                  >
                    <button
                      onClick={() => setActiveDetailItem(item)}
                      className="jt-btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px", flex: "1" }}
                    >
                      AI 진단 & 팁
                    </button>
                    <button
                      onClick={() => handleResetItem(item.id)}
                      title="새 부품으로 교체 완료 시 수명을 100%로 리셋합니다"
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        backgroundColor: "#F0FDF4",
                        color: "#166534",
                        border: "1px solid #BBF7D0",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      교체완료
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      title="삭제"
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        backgroundColor: "#FFF",
                        color: "#9CA3AF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── 4. Gemini API Key 설정 모달 ── */}
      {isApiKeyModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 110,
          }}
          onMouseDown={(e) => {
            backdropMouseDownTarget.current = e.target;
          }}
          onClick={(e) =>
            handleModalCloseSafely(e, () => setIsApiKeyModalOpen(false))
          }
        >
          <div
            className="jt-card"
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "28px",
              backgroundColor: "#FFFFFF",
              position: "relative",
            }}
          >
            <button
              onClick={() => setIsApiKeyModalOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1F2328", marginBottom: "8px" }}>
              🔑 Google Gemini AI API 설정
            </h3>
            <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: "1.6", marginBottom: "16px" }}>
              실제 Google Gemini 모델을 통해 제품 라벨 이미지 인식과 실시간 수명 분석을 진행하려면 API 키를 입력해 주세요.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Gemini API Key
              </label>
              <input
                type="password"
                className="jt-input font-num"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
              />
            </div>

            <div
              style={{
                backgroundColor: "#F9FAFB",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#4B5563",
                marginBottom: "20px",
              }}
            >
              💡 Google AI Studio(
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#305CDE", textDecoration: "underline" }}
              >
                aistudio.google.com
              </a>
              )에서 무료로 API 키를 발급받으실 수 있습니다.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setTempApiKey("");
                  setGeminiApiKey("");
                  localStorage.removeItem("zenitree_gemini_key");
                  setIsApiKeyModalOpen(false);
                }}
                className="jt-btn-secondary"
              >
                키 초기화
              </button>
              <button type="button" onClick={handleSaveApiKey} className="jt-btn-primary">
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. AI 진단 상세 모달 ── */}
      {activeDetailItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onMouseDown={(e) => {
            backdropMouseDownTarget.current = e.target;
          }}
          onClick={(e) =>
            handleModalCloseSafely(e, () => setActiveDetailItem(null))
          }
        >
          <div
            className="jt-card"
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              backgroundColor: "#FFFFFF",
              position: "relative",
            }}
          >
            <button
              onClick={() => setActiveDetailItem(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span className="jt-badge jt-badge-brand">
                {activeDetailItem.analysis.item_identification.brand_applied} 공식 기준 분석
              </span>
              <span className="jt-badge jt-badge-good">신뢰도: HIGH</span>
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#1F2328", marginBottom: "16px" }}>
              {activeDetailItem.name} AI 케어 진단
            </h2>

            <div
              style={{
                backgroundColor: "#EEF2FF",
                borderLeft: "4px solid #305CDE",
                padding: "12px 16px",
                borderRadius: "4px",
                fontSize: "14px",
                color: "#1E3A8A",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}
            >
              <strong>AI 어시스턴트 브리핑:</strong>
              <p style={{ marginTop: "4px" }}>{activeDetailItem.analysis.user_summary}</p>
            </div>

            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#991B1B", fontWeight: "700" }}>
                ⚠️ 교체 지연 시 발생 가능한 위험 요소
              </div>
              <p style={{ marginTop: "6px", fontSize: "13px", color: "#B91C1C", lineHeight: "1.5" }}>
                {activeDetailItem.analysis.risk_and_tips.risk_if_delayed}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1F2328", marginBottom: "8px" }}>
                💡 제조사 권장 유지관리 팁
              </h4>
              <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "#374151", lineHeight: "1.7" }}>
                {activeDetailItem.analysis.risk_and_tips.maintenance_tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "16px" }}>
              <button
                onClick={() => setShowJsonRaw(!showJsonRaw)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#305CDE",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: 0,
                  marginBottom: "8px",
                }}
              >
                {showJsonRaw ? "▲ JSON 데이터 규격 숨기기" : "▼ 표준 JSON 응답 데이터 보기 (API 호환)"}
              </button>

              {showJsonRaw && (
                <pre
                  style={{
                    backgroundColor: "#1F2328",
                    color: "#F3F4F6",
                    padding: "14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    overflowX: "auto",
                    maxHeight: "200px",
                  }}
                >
                  {JSON.stringify(activeDetailItem.analysis, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. 신규 등록 모달 ── */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
          onMouseDown={(e) => {
            backdropMouseDownTarget.current = e.target;
          }}
          onClick={(e) =>
            !isAiLoading && handleModalCloseSafely(e, () => setIsModalOpen(false))
          }
        >
          <div
            className="jt-card"
            style={{
              maxWidth: "560px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "28px",
              backgroundColor: "#FFFFFF",
              position: "relative",
            }}
          >
            <button
              onClick={() => !isAiLoading && setIsModalOpen(false)}
              disabled={isAiLoading}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#1F2328", marginBottom: "6px" }}>
              소모품 등록 & Gemini AI 분석
            </h2>
            <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "18px" }}>
              {geminiApiKey
                ? "✨ Google Gemini AI가 실시간으로 분석합니다. 라벨 사진을 올리시면 더욱 정확합니다."
                : "제조사 공식 매뉴얼 DB를 기반으로 최적의 교체 주기와 위험 요소를 자동 계산합니다."}
            </p>

            <form onSubmit={handleAddItem}>
              {/* 이미지 사진 첨부 영역 */}
              <div
                style={{
                  border: "2px dashed #D1D5DB",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  backgroundColor: "#F9FAFB",
                  marginBottom: "16px",
                }}
              >
                {imagePreview ? (
                  <div>
                    <img
                      src={imagePreview}
                      alt="제품 라벨 미리보기"
                      style={{
                        maxHeight: "140px",
                        margin: "0 auto 10px",
                        borderRadius: "6px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      style={{
                        fontSize: "12px",
                        color: "#DC2626",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      사진 삭제
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "24px", marginBottom: "4px" }}>📷</div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                      제품 라벨 / 계기판 / 영수증 사진 첨부
                    </div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px", marginBottom: "8px" }}>
                      Gemini Vision AI가 이미지 속 텍스트와 모델명을 자동으로 판별합니다
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                      id="label-image-upload"
                    />
                    <label
                      htmlFor="label-image-upload"
                      className="jt-btn-secondary"
                      style={{ display: "inline-block", fontSize: "12px", padding: "6px 12px" }}
                    >
                      사진 선택하기
                    </label>
                  </div>
                )}
              </div>

              {/* 카테고리 선택 */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  카테고리
                </label>
                <select
                  className="jt-select"
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value as ItemCategory;
                    setFormData({
                      ...formData,
                      category: cat,
                      brand: cat === "차량" ? "현대/기아" : cat === "가전" ? "LG전자" : cat === "IT기기" ? "애플" : "일반(공통)",
                    });
                  }}
                >
                  <option value="차량">차량 (자동차/오토바이)</option>
                  <option value="가전">가전제품 (공기청정기/정수기 등)</option>
                  <option value="IT기기">IT기기 (스마트폰/노트북 배터리 등)</option>
                  <option value="생필품/기타">생필품/위생 (칫솔/필터/소모품)</option>
                </select>
              </div>

              {/* 제조사(회사) 선택 및 입력 */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  제조사 (회사 / 브랜드)
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className="jt-select"
                    style={{ flex: 1 }}
                    value={formData.brand}
                    onChange={(e) => {
                      const selectedBrand = e.target.value;
                      const preset = BRAND_PRESETS.find(
                        (p) => p.brand === selectedBrand && p.category === formData.category
                      );
                      setFormData({
                        ...formData,
                        brand: selectedBrand,
                        itemName: preset ? preset.itemName : formData.itemName,
                      });
                    }}
                  >
                    {formData.category === "차량" && (
                      <>
                        <option value="현대/기아">현대/기아</option>
                        <option value="BMW">BMW</option>
                        <option value="벤츠">벤츠 (Mercedes-Benz)</option>
                        <option value="테슬라">테슬라 (Tesla)</option>
                        <option value="기타">기타 제조사 (표준 기준)</option>
                      </>
                    )}
                    {formData.category === "가전" && (
                      <>
                        <option value="LG전자">LG전자</option>
                        <option value="삼성전자">삼성전자</option>
                        <option value="다이슨">다이슨 (Dyson)</option>
                        <option value="샤오미">샤오미 (Xiaomi)</option>
                        <option value="기타">기타 가전사 (표준 기준)</option>
                      </>
                    )}
                    {formData.category === "IT기기" && (
                      <>
                        <option value="애플">애플 (Apple)</option>
                        <option value="삼성전자">삼성전자 (Galaxy)</option>
                        <option value="기타">기타 IT브랜드</option>
                      </>
                    )}
                    {formData.category === "생필품/기타" && (
                      <>
                        <option value="오랄비/필립스">오랄비 / 필립스</option>
                        <option value="일반(공통)">일반 공통 브랜드</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 소모품명 */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  소모품 명칭
                </label>
                <input
                  type="text"
                  className="jt-input"
                  placeholder="예: 엔진오일, HEPA 필터, 배터리 등"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                />
              </div>

              {/* 사용 시작일 / 장착일 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    장착 / 구매일
                  </label>
                  <input
                    type="date"
                    className="jt-input font-num"
                    value={formData.installedDate}
                    onChange={(e) => setFormData({ ...formData, installedDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    {formData.category === "차량" ? "교체 후 주행거리 (km)" : "사용 경과 (개월/추정)"}
                  </label>
                  <input
                    type="number"
                    className="jt-input font-num"
                    placeholder={formData.category === "차량" ? "예: 5000" : "예: 6"}
                    value={formData.currentUsage || ""}
                    onChange={(e) => setFormData({ ...formData, currentUsage: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              {/* 사용 환경 조건 */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  사용 환경 조건
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <label
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: formData.condition === "normal" ? "2px solid #305CDE" : "1px solid #D1D5DB",
                      backgroundColor: formData.condition === "normal" ? "#F0F5FF" : "#FFFFFF",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="radio"
                      name="condition"
                      checked={formData.condition === "normal"}
                      onChange={() => setFormData({ ...formData, condition: "normal" })}
                    />
                    일반 조건 (표준)
                  </label>

                  <label
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: formData.condition === "harsh" ? "2px solid #E14B4B" : "1px solid #D1D5DB",
                      backgroundColor: formData.condition === "harsh" ? "#FEF2F2" : "#FFFFFF",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="radio"
                      name="condition"
                      checked={formData.condition === "harsh"}
                      onChange={() => setFormData({ ...formData, condition: "harsh" })}
                    />
                    가혹 조건 (단거리/정체/먼지)
                  </label>
                </div>
              </div>

              {/* 하단 액션 버튼 */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="jt-btn-secondary"
                  disabled={isAiLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="jt-btn-primary"
                  disabled={isAiLoading}
                  style={{ minWidth: "140px" }}
                >
                  {isAiLoading ? "AI 정밀 분석 중..." : "AI 수명 분석 및 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 심플한 즉시 설치 안내 토스트 (대시보드에서도 1줄 알림 제공) */}
      {installToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1F2328",
            color: "#FFFFFF",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            fontSize: "13px",
            fontWeight: "600",
            zIndex: 300,
            maxWidth: "90%",
            textAlign: "center",
            border: "1px solid #38BDF8",
          }}
        >
          {installToast}
        </div>
      )}
    </div>
  );
}
