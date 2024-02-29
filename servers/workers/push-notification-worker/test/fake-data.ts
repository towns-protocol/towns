import { SubscriptionObject } from '../src/types'
import { WebPushSubscription } from '../src/web-push/web-push-types'

export function createFakeWebPushSubscription(): SubscriptionObject {
  const pushSubscription: WebPushSubscription = {
    endpoint: 'https://test.com/webpush/user/1234',
    keys: {
      auth: '-FQZjYtoXi3goOATytC1wQ',
      p256dh:
        'BH-ofVEl85HQ1LrL-IneqnyvfhqL2TH1KHsB0L1cov_cQazLzqOvvX5b7D_zdTgDPg5zd12OE1LWHCMv-ZNazCo',
    },
  }
  return pushSubscription
}
