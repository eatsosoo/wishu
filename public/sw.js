/* global self */
// Push only: do not cache HTML, API responses, or private couple data.
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', event => {
  let payload;
  try { payload = event.data?.json(); } catch { /* Still display a visible fallback. */ }
  const giftId = typeof payload?.giftId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(payload.giftId) ? payload.giftId : null;
  const senderName = typeof payload?.senderName === 'string' && payload.senderName.trim() ? payload.senderName.trim() : 'Người ấy';
  event.waitUntil(Promise.all([
    self.registration.showNotification('Một lời thương vừa ghé đến 🎁', {
      body: `${senderName} đã gửi một món quà. Chạm để mở ♡`,
      icon: '/icon.png',
      tag: giftId ? `gift:${giftId}` : 'gift',
      data: { url: giftId ? `/gift/${encodeURIComponent(giftId)}` : '/notifications' },
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'GIFT_PUSH' }));
    }),
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const safePath = typeof path === 'string' && /^\/gift\/[a-zA-Z0-9-]{1,100}$/.test(path) ? path : '/notifications';
  const url = new URL(safePath, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        const navigated = await client.navigate(url);
        if (navigated) { await navigated.focus(); return; }
      } catch { /* Try another window, then open a new one. */ }
    }
    await self.clients.openWindow(url);
  })());
});
