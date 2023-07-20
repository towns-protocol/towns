import { SubscriptionObject, Urgency } from '../types'
import { JwtData } from './jwt'

export interface VapidDetails {
  publicKey: string
  privateKey: string
  subject: string
}

export interface WebPushOptions {
  vapidDetails: VapidDetails
  jwtData: JwtData
  payload: object
  ttl: number
  topic?: string
  urgency?: Urgency
}

export interface WebPushSubscriptionKeys {
  p256dh: string
  auth: string
}

function isWebPushSubscriptionKeys(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is WebPushSubscriptionKeys {
  return (
    typeof args.keys === 'object' &&
    typeof args.keys.auth === 'string' &&
    typeof args.keys.p256dh === 'string'
  )
}

export interface WebPushSubscription extends SubscriptionObject {
  /**
   * The endpoint is the push services URL. To trigger a push message, make a
   * POST request to this URL.
   */
  endpoint: string
  /**
   * The keys object contains the values used to encrypt message data sent with
   * a push message.
   */
  keys: WebPushSubscriptionKeys
  expirationTime?: number | null
}

export function isWebPushSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
): args is WebPushSubscription {
  return (
    typeof args.endpoint === 'string' && isWebPushSubscriptionKeys(args.keys)
  )
}
