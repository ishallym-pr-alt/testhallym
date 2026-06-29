self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/'
      },
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((windowClients) => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            client.postMessage({ type: 'SYNC_DATA' });
          }
        })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = new URL(event.notification.data.url, self.location.origin);
  const urlToOpen = targetUrl.href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      let matchingClient = null;
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === targetUrl.origin) {
          matchingClient = client;
          break;
        }
      }

      if (matchingClient) {
        const page = targetUrl.searchParams.get('page');
        const id = targetUrl.searchParams.get('id');
        
        return matchingClient.focus().then((focusedClient) => {
          if (focusedClient) {
            focusedClient.postMessage({
              type: 'NAVIGATE',
              page: page,
              id: id || null
            });
          }
        });
      } else {
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }
    })
  );
});
