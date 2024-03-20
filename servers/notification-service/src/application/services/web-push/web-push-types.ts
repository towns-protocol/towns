import { urgency } from '../../schema/notificationSchema'
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
    channelId: string
    topic?: string
    urgency?: urgency
}

export interface WebPushSubscriptionKeys {
    p256dh: string
    auth: string
}

export interface WebPushSubscription {
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

export enum SendPushStatus {
    Success = 'success',
    Error = 'error',
    NotSubscribed = 'not-subscribed',
}

export interface SendPushResponse {
    status: SendPushStatus
    userId: string
    pushSubscription: string
    message?: string
}
