import webpush from 'web-push';

let isVapidInitialized = false;

function ensureVapidDetails() {
  if (isVapidInitialized) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(
        'mailto:admin@hallym.test',
        publicKey,
        privateKey
      );
      isVapidInitialized = true;
    } catch (e) {
      console.error('Failed to set VAPID details:', e);
    }
  } else {
    console.warn('VAPID keys are missing. Push notifications will not be sent.');
  }
}

export const sendWebPushToAll = async (
  subscriptions: Array<{ empId: string; sub: webpush.PushSubscription }>,
  payload: { title: string; body: string; url?: string },
  excludeEmpId?: string | number
) => {
  ensureVapidDetails();
  if (!isVapidInitialized) return;

  if (!subscriptions || subscriptions.length === 0) return;

  const payloadString = JSON.stringify(payload);

  const pushPromises = subscriptions
    .filter(s => {
      if (excludeEmpId === undefined || excludeEmpId === null) return true;
      return String(s.empId).trim() !== String(excludeEmpId).trim();
    })
    .map(s =>
      webpush.sendNotification(s.sub, payloadString).catch(err => {
        console.error(`Failed to send push to ${s.empId}:`, err);
      })
    );

  await Promise.allSettled(pushPromises);
};
