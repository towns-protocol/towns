import { Env } from 'index'

export function createFakePushSubscription() {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/1234567890',
    keys: {
      auth: 'auth',
      p256dh: 'p256dh',
    },
  }
}
