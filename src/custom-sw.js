const CACHE_NAME = 'united-rh-' + new Date().getTime();
const APP_NAME = 'United Services RH';
const BRAND_COLOR = '#CDA45E'; // United Services gold
const BRAND_BG = '#000000'; // United Services black

const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/uploads/photos/logo.png',
  '/uploads/photos/logo.ico'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('📱 Service Worker: Installing United Services RH...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Service Worker: Caching essential files...');
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`⚠️ Failed to cache ${url}:`, error);
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation error:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✨ Cache cleanup complete');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(error => {
          console.error('🌐 Fetch failed:', error);
          return caches.match('/offline.html');
        });
      })
  );
});

// ========== ENHANCED PUSH NOTIFICATIONS ==========
// WhatsApp/Messenger style notifications

// Helper function to play notification sound (optional)
function playNotificationSound() {
  // This is optional - browsers may play default notification sounds
  try {
    // You can add a custom notification sound if desired
    // const audio = new Audio('/assets/sounds/notification.mp3');
    // audio.play().catch(() => {});
  } catch (error) {
    // Sound playback not critical
  }
}

// Push event handler
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  const showModernNotification = () => {
    let notificationData = {
      title: APP_NAME,
      body: 'Nouveau message',
      icon: '/uploads/photos/logo.png',
      badge: '/uploads/photos/logo.png',
      tag: 'general',
      timestamp: Date.now(),
      data: {},
      urgent: false,
      type: 'info'
    };

    // Parse incoming data
    if (event.data) {
      try {
        const data = event.data.json();
        notificationData = { ...notificationData, ...data };
      } catch (error) {
        const text = event.data.text();
        if (text) {
          notificationData.body = text;
        }
      }
    }

    // WhatsApp/Messenger style options
    const options = {
      body: notificationData.body,
      icon: notificationData.icon || '/uploads/photos/logo.png',
      badge: notificationData.badge || '/uploads/photos/logo.png',
      image: notificationData.image,
      tag: notificationData.tag || 'general',
      data: notificationData.data || notificationData,
      requireInteraction: notificationData.urgent || false,
      silent: false,
      renotify: true,
      timestamp: notificationData.timestamp,
      
      // WhatsApp-like vibration pattern
      vibrate: [200, 100, 200, 100, 400, 100, 200],
      
      // Simple action buttons - Only Open and Dismiss
      actions: [
        {
          action: 'open',
          title: '📱 Ouvrir'
        },
        {
          action: 'dismiss',
          title: '✗ Fermer'
        }
      ],
      
      // Rich notification features
      dir: 'auto', // Text direction
      lang: 'fr',
      
      // For Android (if supported)
      android: {
        channelId: 'hr_notifications',
        icon: 'notification_icon',
        color: BRAND_COLOR
      }
    };

    // Play notification sound
    playNotificationSound();

    return self.registration.showNotification(
      notificationData.title,
      options
    );
  };

  event.waitUntil(
    showModernNotification()
      .then(() => {
        console.log('✅ Modern notification displayed');
        
        // Inform open clients about the notification
        return self.clients.matchAll();
      })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            data: {
              app: APP_NAME,
              timestamp: new Date().toISOString()
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Error showing notification:', error);
        
        // Fallback to simple notification
        const fallbackOptions = {
          body: 'Vous avez une nouvelle notification',
          icon: '/uploads/photos/logo.png',
          badge: '/uploads/photos/logo.png',
          vibrate: [200, 100, 200]
        };
        
        return self.registration.showNotification(APP_NAME, fallbackOptions);
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag);
  
  // Close the notification
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  // Handle different actions
  let urlToOpen = notificationData.url || '/dashboard';
  
  // Only handle 'open' and 'dismiss' actions
  if (action === 'dismiss') {
    // Just close the notification, no further action needed
    return;
  }
  
  // Default to 'open' action or no action specified
  if (notificationData.page) {
    urlToOpen = notificationData.page;
  }
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check for existing windows
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus existing window
          client.focus();
          
          // Send notification data to the app
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: {
              ...notificationData,
              action: action,
              timestamp: new Date().toISOString()
            }
          });
          
          return;
        }
      }
      
      // If no window is open, open a new one
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Notification close handler (when user dismisses)
self.addEventListener('notificationclose', (event) => {
  console.log('✕ Notification dismissed:', event.notification.tag);
  
  // Optional: Send analytics when notification is dismissed
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_DISMISSED',
        data: {
          tag: event.notification.tag,
          timestamp: new Date().toISOString()
        }
      });
    });
  });
});

// Message handler from client
self.addEventListener('message', (event) => {
  console.log('📨 Message from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Optional: Remove periodic sync if not needed
// self.addEventListener('periodicsync', (event) => {
//   if (event.tag === 'update-notifications') {
//     console.log('🔄 Periodic sync for notifications');
//     event.waitUntil(updateNotifications());
//   }
// });

// Optional async function for updating notifications (commented out)
// async function updateNotifications() {
//   try {
//     const response = await fetch('/api/notifications/unread');
//     if (response.ok) {
//       const data = await response.json();
//       
//       // Update badge count
//       if (data.count > 0 && navigator.setAppBadge) {
//         navigator.setAppBadge(data.count);
//       }
//     }
//   } catch (error) {
//     console.error('❌ Error updating notifications:', error);
//   }
// }