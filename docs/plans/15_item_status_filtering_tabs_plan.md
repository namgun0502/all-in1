# 대시보드 상태별 품목 필터링(내 관리 품목 / GOOD / CAUTION / REPLACE) 구현 계획서

## 1. 개요 및 목적
- 대시보드 상단의 4가지 KPI 요약 카드("내 관리 품목", "수명 양호", "점검 권장", "즉시 교체 필요")를 클릭 가능한 대화형 필터 탭으로 업그레이드합니다.
- 사용자가 직관적으로 원하는 상태의 소모품만 모아보거나 전체 목록을 한눈에 조회할 수 있도록 합니다.

## 2. 사용자 요청 요구사항
1. **내 관리 품목 클릭**:
   - 수명 양호 (GOOD), 점검 권장 (CAUTION), 즉시 교체 필요 (REPLACE) 전체 품목이 한 번에 노출
2. **수명 양호 (GOOD) 클릭**:
   - 수명 양호(GOOD) 상태인 소모품만 노출
3. **점검 권장 (CAUTION) 클릭**:
   - 점검 권장(CAUTION) 상태인 소모품만 노출
4. **즉시 교체 필요 (REPLACE) 클릭**:
   - 즉시 교체 필요(REPLACE_NOW) 상태인 소모품만 노출

## 3. 상세 구현 설계
1. **상태 변수 추가 (`app/page.tsx`)**:
   - `const [selectedStatus, setSelectedStatus] = useState<"ALL" | "GOOD" | "CAUTION" | "REPLACE_NOW">("ALL");`
2. **필터링 로직 확장**:
   - `selectedStatus`와 `selectedCategory`를 결합하여 정확한 조건의 품목 필터링
3. **카드 UI 시각적 하이라이트**:
   - 마우스 커서 포인터(`cursor: pointer`) 및 선택 시 테두리/배경색 강조
   - 선택된 상태 배지 표시 및 원클릭 전체보기 해제 버튼 제공