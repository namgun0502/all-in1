// ============================================================
// 제니트리 스마트케어 - PWA 서비스워커 (Service Worker)
// 역할: 앱을 홈 화면/바탕화면에 설치 가능하게 만들고
//       오프라인에서도 기본 화면이 뜨도록 핵심 파일을 미리 저장(캐싱)합니다.
// ============================================================

// 캐시 이름 (버전 업 시 이 이름을 변경하면 이전 캐시가 자동 삭제됩니다)
const CACHE_NAME = 'zenitree-care-v2';

// 앱 설치 시 미리 저장해 둘 핵심 파일 목록
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/brand/logo/icon-192.png',
  '/brand/logo/icon-512.png',
];

// ── 설치(install) 이벤트: 앱을 처음 설치할 때 실행 ──
self.addEventListener('install', (event) => {
  // skipWaiting: 새 서비스워커를 즉시 활성화 (대기 없이 바로 적용)
  self.skipWaiting();

  // 핵심 파일들을 미리 캐시에 저장
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] 사전 캐시 저장 알림:', err);
      });
    })
  );
});

// ── 활성화(activate) 이벤트: 새 버전으로 업데이트 시 실행 ──
self.addEventListener('activate', (event) => {
  // 현재 버전이 아닌 이전 캐시는 모두 삭제
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // 이 서비스워커가 즉시 모든 탭을 제어하도록 활성화
      return self.clients.claim();
    })
  );
});

// ── fetch 이벤트: 모든 네트워크 요청을 가로채서 처리 ──
// 전략: "네트워크 우선 → 실패 시 캐시" (항상 최신 데이터를 우선 사용)
self.addEventListener('fetch', (event) => {
  // GET 요청만 캐시 처리 (POST 등 API 요청은 그냥 통과)
  if (event.request.method !== 'GET') return;

  // chrome-extension 등 외부 스킴은 무시
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 네트워크 성공: 응답을 캐시에도 저장하고 반환
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패 (오프라인): 캐시에서 찾아서 반환
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // 캐시에도 없으면 기본 페이지('/')를 반환
          return caches.match('/');
        });
      })
  );
});
