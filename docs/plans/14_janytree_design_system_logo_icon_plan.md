# 제니트리 디자인 시스템 공식 로고 PWA 앱 아이콘 적용 계획서

## 1. 개요 및 목적
- **목적**: 앱(PWA) 설치 시 생성되는 바탕화면/홈 화면 아이콘을 제니트리 브랜드 디자인 시스템 가이드에 부합하는 공식 제니트리 로고(`J+` 심볼 마크)로 교체합니다.
- **적용 대상**:
  - `public/brand/logo/icon-192.png` (192x192 PNG)
  - `public/brand/logo/icon-512.png` (512x512 PNG)
  - `public/brand/logo/icon-janytree.svg` (정밀 벡터 원본)
  - `public/sw.js` (서비스워커 캐시 v4 업그레이드)

## 2. 디자인 명세
- **심볼 형태**: 제니트리 공식 로고(`logo-h.svg`) 내 원형 마크 추출
  - 배경 원형: 제니트리 다크 차콜 (`#1F2328`)
  - 내부 심볼: 정밀 기하학적 형태의 화이트 `J` 및 상단 플러스 `+` 기호 (`#FFFFFF`)
  - 중심 정렬: 광학적 균형(Optical Center)을 고려하여 512x512 및 192x192 중앙 정밀 배치

## 3. 작업 내역
1. **SVG 원본 생성**:
   - `public/brand/logo/icon-janytree.svg` 생성 (다크 차콜 원형 + 화이트 J+ 마크)
2. **PNG 고해상도 변환**:
   - `sharp` 모듈을 활용하여 192x192 및 512x512 무손실 PNG 렌더링 적용
3. **PWA 캐시 동기화**:
   - `public/sw.js`의 `CACHE_NAME`을 `zenitree-care-v4`로 올려 기존 기기 캐시 자동 무효화 및 새 로고 강제 수신
4. **빌드 검증**:
   - `next build` 정상 수행 확인 (에러 0건)