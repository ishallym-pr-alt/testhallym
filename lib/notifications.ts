export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }
  
  let permission = Notification.permission;
  if (permission !== 'granted' && permission !== 'denied') {
    permission = await Notification.requestPermission();
  }
  return permission === 'granted';
};

export const subscribeToWebPush = async (empId: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('푸시 알림을 지원하지 않는 브라우저입니다.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker 등록 완료:', registration);

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.error('VAPID Public Key가 환경 변수에 설정되지 않았습니다.');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });

    console.log('Push Subscription 완료:', subscription);

    // 서버(Next.js API -> GAS)에 토큰 저장
    await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empId,
        subscription,
      }),
    });

    console.log('구독 정보가 서버에 성공적으로 전송되었습니다.');
  } catch (error) {
    console.error('푸시 구독 실패:', error);
  }
};
