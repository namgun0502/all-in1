"use client";

// ============================================================================
// 스마트 라이프 소모품 케어 AI 어시스턴트 - 메인 대시보드
// (app/page.tsx)
// 제니트리 통합 디자인 시스템(JT Master v3.0) 완벽 적용
// ============================================================================

import React, { useState, useEffect } from "react";
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

// 기본 초기 예시 데이터 (처음 방문 시 제공)
const INITIAL_ITEMS: ConsumableItem[] = [
  {
    id: "demo-1",
    brand: "현대/기아",
    name: "아반떼 CN7 엔진오일 및 오일필터",
    category: "차량",
    installedDate: "2026-03-01",
    condition: "normal",
    currentUsage: 5500,
    usageUnit: "km",
    createdAt: new Date().toISOString(),
    analysis: analyzeConsumableItem({
      category: "차량",
      brand: "현대/기아",
      itemName: "엔진오일 및 오일필터",
      installedDate: "2026-03-01",
      currentUsage: 5500,
      condition: "normal",
    }),
  },
  {
    id: "demo-2",
    brand: "LG전자",
    name: "퓨리케어 공기청정기 일체형 V필터",
    category: "가전",
    installedDate: "2025-10-10",
    condition: "normal",
    currentUsage: 11,
    usageUnit: "개월",
    createdAt: new Date().toISOString(),
    analysis: analyzeConsumableItem({
      category: "가전",
      brand: "LG전자",
      itemName: "퓨리케어 공기청정기 일체형 V필터",
      installedDate: "2025-10-10",
      currentUsage: 11,
      condition: "normal",
    }),
  },
  {
    id: "demo-3",
    brand: "애플",
    name: "아이폰 15 Pro 내장 배터리",
    category: "IT기기",
    installedDate: "2024-09-20",
    condition: "harsh",
    currentUsage: 23,
    usageUnit: "개월",
    createdAt: new Date().toISOString(),
    analysis: analyzeConsumableItem({
      category: "IT기기",
      brand: "애플",
      itemName: "아이폰 / 맥북 배터리",
      installedDate: "2024-09-20",
      currentUsage: 23,
      condition: "harsh",
    }),
  },
];

export default function SmartLifeCarePage() {
  // ── 1. 상태(State) 관리 ──
  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeDetailItem, setActiveDetailItem] = useState<ConsumableItem | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);

  // 신규 등록 폼 상태
  const [formData, setFormData] = useState({
    brand: "현대/기아",
    category: "차량" as ItemCategory,
    itemName: "엔진오일 및 오일필터",
    installedDate: new Date().toISOString().split("T")[0],
    currentUsage: 0,
    condition: "normal" as UsageCondition,
  });

  // ── 2. 로컬 스토리지 불러오기 및 저장 ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zenitree_care_items");
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems(INITIAL_ITEMS);
      }
    } catch {
      setItems(INITIAL_ITEMS);
    }
  }, []);

  const saveItems = (newItems: ConsumableItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem("zenitree_care_items", JSON.stringify(newItems));
    } catch (err) {
      console.error("저장 실패", err);
    }
  };

  // ── 3. 필터링 및 통계 계산 ──
  const filteredItems = items.filter((item) => {
    if (selectedCategory === "전체") return true;
    return item.category === selectedCategory;
  });

  const totalCount = items.length;
  const goodCount = items.filter((i) => i.analysis.replacement_analysis.status === "GOOD").length;
  const cautionCount = items.filter((i) => i.analysis.replacement_analysis.status === "CAUTION").length;
  const replaceNowCount = items.filter((i) => i.analysis.replacement_analysis.status === "REPLACE_NOW").length;

  // ── 4. 핸들러: 소모품 신규 등록 ──
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      alert("소모품명을 입력해주세요.");
      return;
    }

    // AI 분석 엔진 가동
    const analysis = analyzeConsumableItem({
      category: formData.category,
      brand: formData.brand,
      itemName: formData.itemName,
      installedDate: formData.installedDate,
      currentUsage: Number(formData.currentUsage) || 0,
      condition: formData.condition,
    });

    const newItem: ConsumableItem = {
      id: "item-" + Date.now(),
      brand: formData.brand.trim() || "기타/표준",
      name: formData.itemName.trim(),
      category: formData.category,
      installedDate: formData.installedDate,
      condition: formData.condition,
      currentUsage: Number(formData.currentUsage) || 0,
      usageUnit: formData.category === "차량" ? "km" : "개월",
      analysis: analysis,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    setIsModalOpen(false);

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

  // ── 5. 핸들러: 교체 완료 (수명 100% 리셋) ──
  const handleResetItem = (id: string) => {
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

    saveItems(updated);
    if (activeDetailItem?.id === id) {
      setActiveDetailItem({
        ...target,
        installedDate: todayStr,
        currentUsage: 0,
        analysis: newAnalysis,
      });
    }
  };

  // ── 6. 핸들러: 삭제 ──
  const handleDeleteItem = (id: string, name: string) => {
    if (!confirm(`'${name}' 소모품을 목록에서 삭제하시겠습니까?`)) {
      return;
    }
    const updated = items.filter((i) => i.id !== id);
    saveItems(updated);
    if (activeDetailItem?.id === id) {
      setActiveDetailItem(null);
    }
  };

  // 프로그레스 바 색상 매핑
  const getStatusColor = (status: string) => {
    if (status === "GOOD") return "var(--seed-color-success)";
    if (status === "CAUTION") return "var(--seed-color-warning)";
    return "var(--seed-color-error)";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-base)" }}>
      {/* ── 상단 헤더 (제니트리 탑 바) ── */}
      <header
        style={{
          backgroundColor: "#1F2328",
          color: "#FFFFFF",
          borderBottom: "1px solid #33383F",
          padding: "16px 24px",
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
          {/* 브랜드 타이틀 */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#305CDE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "18px",
                color: "#FFFFFF",
              }}
            >
              JT
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "-0.02em" }}>
                스마트 라이프 소모품 케어 AI
              </div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                제니트리 통합 디자인 시스템 v3.0 · 회사별 맞춤 공식 주기 케어
              </div>
            </div>
          </div>

          {/* 우측 배지 및 액션 */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: "12px",
                backgroundColor: "#2B313A",
                color: "#14A870",
                padding: "4px 10px",
                borderRadius: "4px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#14A870" }} />
              Cloudflare Pages Ready
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="jt-btn-accent"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              + 소모품 등록 & AI 분석
            </button>
          </div>
        </div>
      </header>

      {/* ── 메인 컨테이너 ── */}
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
          {/* 총 자산 */}
          <div className="jt-card" style={{ padding: "20px" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              총 관리 품목
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#1F2328" }} className="font-num">
              {totalCount} <span style={{ fontSize: "14px", fontWeight: "500" }}>개</span>
            </div>
          </div>

          {/* 정상 상태 */}
          <div className="jt-card" style={{ padding: "20px", borderLeft: "4px solid #14A870" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              수명 양호 (GOOD)
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#14A870" }} className="font-num">
              {goodCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#1F2328" }}>개</span>
            </div>
          </div>

          {/* 주의/점검 */}
          <div className="jt-card" style={{ padding: "20px", borderLeft: "4px solid #F0B01C" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-sub)", marginBottom: "4px" }}>
              점검 권장 (CAUTION)
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "#B45309" }} className="font-num">
              {cautionCount} <span style={{ fontSize: "14px", fontWeight: "500", color: "#1F2328" }}>개</span>
            </div>
          </div>

          {/* 즉시 교체 */}
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

        {/* ── 3. 소모품 카드 리스트 ── */}
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
                    {/* 상단 뱃지 라인 */}
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

                    {/* 품목 타이틀 */}
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

                    {/* 수명 게이지 프로그레스 바 */}
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

                    {/* 상세 스펙 메타 정보 */}
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

                  {/* 하단 카드 버튼 액션 */}
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

      {/* ── 4. AI 진단 상세 모달 (JSON 스키마 결과 뷰어) ── */}
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
          onClick={() => setActiveDetailItem(null)}
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
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
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

            {/* AI 요약 */}
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

            {/* 교체 지연 시 위험 요소 경고 */}
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

            {/* 관리 팁 */}
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

            {/* JSON 원문 보기 토글 */}
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

      {/* ── 5. 신규 소모품 등록 & AI 분석 모달 ── */}
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
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="jt-card"
            style={{
              maxWidth: "540px",
              width: "100%",
              padding: "28px",
              backgroundColor: "#FFFFFF",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
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
              소모품 등록 & AI 수명 분석
            </h2>
            <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "20px" }}>
              제조사(회사)와 사용 정보를 입력하시면 최적의 교체 주기와 위험 요소를 자동 계산합니다.
            </p>

            <form onSubmit={handleAddItem}>
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
                    일반 조건 (표준 주행/사용)
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
                    가혹 조건 (단거리/먼지/정체)
                  </label>
                </div>
              </div>

              {/* 하단 버튼 */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="jt-btn-secondary">
                  취소
                </button>
                <button type="submit" className="jt-btn-primary">
                  AI 수명 분석 및 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
