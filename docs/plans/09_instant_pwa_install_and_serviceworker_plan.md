# 09_instant_pwa_install_and_serviceworker_plan.md

남건, **"앱 설치 버튼을 누르면 브라우저 안내 모달 대신 즉시 설치 창이 뜨도록"** 개선하는 작업이 완료되었습니다.

---

## 1. 개선 배경 및 원인 분석
- 브라우저(Chrome, Edge 등)는 웹사이트가 **PWA 설치 요건(Service Worker 활성화 + Web Manifest + HTTPS)**을 온전히 충족해야만 설치 이벤트(`beforeinstallprompt`)를 활성화합니다.
- 이전에는 서비스워커 파일(`sw.js`)이 없었기 때문에 브라우저가 바로 설치 창을 띄우지 못하고 대체 안내 팝업이 노출되었습니다.

---

## 2. 수행한 작업 상세
1. **PWA 핵심 서비스워커 파일 추가 (`public/sw.js`)**:
   - 브라우저의 PWA 검증 엔진을 통과하고 설치 프롬프트를 즉시 발동시킬 수 있도록 최소 필수 서비스워커 탑재.
2. **서비스워커 자동 등록 (`app/page.tsx`)**:
   - 앱 로드 시 `navigator.serviceWorker.register('/sw.js')`를 실행하여 브라우저가 접속 즉시 '설치 가능한 앱'으로 인식하도록 개선.
3. **하늘색 로고 규격 정비 (`public/brand/logo/logo-sky.svg`)**:
   - PWA 아이콘 파싱 시 오류가 없도록 완전한 정품 XML 형식으로 정비.

---

## 3. 검증 결과
- **OpenNext Cloudflare 빌드 검증 (`npm run cf:build`)**: **성공 (Exit Code 0)**
- 변경 파일:
  - `public/sw.js` (NEW)
  - `app/page.tsx` (MODIFY)
  - `public/brand/logo/logo-sky.svg` (MODIFY)
