import {
    SendPushResponse,
    SendPushStatus,
    VapidDetails,
    WebPushOptions,
    WebPushSubscription,
} from './web-push-types'
import { encrypt, getPublicKeyFromJwk, sign, vapidKeysToJsonWebKey } from './crypto-utils'
import { JwtData } from './jwt'
import { base64ToUrlEncoding } from './utils'
import { NotificationOptions } from '../../notificationService'
import { PushSubscription } from '@prisma/client'
import { Urgency } from '../../notificationSchema'
import crypto from 'crypto'
import { env } from '../../utils/environment'
import { logger } from '../logger'
import { Provider, Notification } from '@parse/node-apn'
import { ApnsEndpoint } from '../../tagSchema'

const authKey = env.APNS_AUTH_KEY.replaceAll('\\n', '\n')
const apnsProviderProd = new Provider({
    token: {
        key: Buffer.from(authKey),
        keyId: env.APNS_KEY_ID,
        teamId: env.APNS_TEAM_ID,
    },
    production: true,
})

const apnsProviderSandbox = new Provider({
    token: {
        key: Buffer.from(authKey),
        keyId: env.APNS_KEY_ID,
        teamId: env.APNS_TEAM_ID,
    },
    production: false,
})

export async function sendNotificationViaWebPush(
    options: NotificationOptions,
    subscribed: PushSubscription,
): Promise<SendPushResponse> {
    const vapidDetails: VapidDetails = {
        publicKey: env.VAPID_PUBLIC_KEY as string,
        privateKey: env.VAPID_PRIVATE_KEY as string,
        subject: env.VAPID_SUBJECT as string,
    }
    if (!vapidDetails.publicKey || !vapidDetails.privateKey || !vapidDetails.subject) {
        throw new Error('Missing required VAPID environment variables')
    }
    try {
        const subscription: WebPushSubscription = JSON.parse(subscribed.PushSubscription)
        if (!subscription) {
            logger.error('cannot parse subscription')
            return {
                status: SendPushStatus.Error,
                message: 'cannot parse subscription',
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
            }
        }
        // ok to proceed
        const host = new URL(subscription.endpoint).origin
        const ttl = 12 * 60 * 60 // 12 hours
        const jwtData: JwtData = {
            aud: host,
            exp: Math.floor(Date.now() / 1000) + ttl,
            sub: vapidDetails.subject,
        }
        const pushOptions: WebPushOptions = {
            vapidDetails,
            jwtData,
            payload: options.payload,
            channelId: options.channelId,
            // disable topic
            // https://linear.app/hnt-labs/issue/HNT-4314/dont-group-notification-by-channelid-to-make-each-notification-for-a
            //topic: patchTopicToEnsureSpecCompliance(options.channelId),
            ttl,
            urgency: options.urgency ?? Urgency.HIGH,
        }

        // create the request to send to the push service
        const request = await createRequest(pushOptions, subscription)
        logger.info(`request url ${request.url}`)

        const response = await fetch(request)
        const status = response.status
        logger.info('sendNotificationViaWebPush response', {
            requestUrl: request.url,
            status: response.status,
            message: await response.text(),
            userId: options.userId,
        })

        return {
            status: status >= 200 && status <= 204 ? SendPushStatus.Success : SendPushStatus.Error,
            userId: options.userId,
            pushSubscription: subscribed.PushSubscription,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        logger.info(e)
        return {
            status: SendPushStatus.Error,
            message: e.message,
            userId: options.userId,
            pushSubscription: subscribed.PushSubscription,
        }
    }
}

export async function sendNotificationViaAPNS(
    options: NotificationOptions,
    subscribed: PushSubscription,
): Promise<SendPushResponse> {
    try {
        const subscription: WebPushSubscription = JSON.parse(subscribed.PushSubscription)
        if (
            subscription.endpoint !== ApnsEndpoint.Production &&
            subscription.endpoint !== ApnsEndpoint.Sandbox
        ) {
            return {
                status: SendPushStatus.Error,
                message: 'invalid APNS endpoint',
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
            }
        }
        const provider =
            subscription.endpoint === ApnsEndpoint.Sandbox ? apnsProviderSandbox : apnsProviderProd

        const notification = new Notification()
        notification.alert = 'You have a new message'
        notification.expiry = Math.floor(Date.now() / 1000) + 3600 // 1hr
        notification.topic = env.APNS_TOWNS_APP_IDENTIFIER
        notification.sound = 'default'
        notification.pushType = 'alert'
        notification.payload = options.payload
        notification.threadId = options.channelId
        notification.mutableContent = true

        const response = await provider.send(notification, subscription.keys.auth)
        logger.info('sendNotificationViaAPNS response', {
            environment: subscription.endpoint,
            failed: response.failed,
            sent: response.sent,
            userId: options.userId,
        })
        if (response.failed.length > 0) {
            return {
                status: SendPushStatus.Error,
                message: response.failed[0].response?.reason,
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
            }
        } else {
            return {
                status: SendPushStatus.Success,
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
            }
        }
    } catch (err) {
        return {
            status: SendPushStatus.Error,
            message: `Error sending APNS notification: ${err}`,
            userId: options.userId,
            pushSubscription: subscribed.PushSubscription,
        }
    }
}

export function patchTopicToEnsureSpecCompliance(topic: string): string {
    // https://developer.apple.com/documentation/usernotifications/sending_web_push_notifications_in_web_apps_safari_and_other_browsers
    const MAX_LENGTH = 32
    const base64EncodedTopicWithMaxLength = btoa(topic).substring(0, MAX_LENGTH)
    return base64EncodedTopicWithMaxLength
}

async function createRequest(
    options: WebPushOptions,
    target: WebPushSubscription,
): Promise<Request> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const localKeys = (await crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveBits'],
    )) as CryptoKeyPair

    const payload = JSON.stringify(options.payload)
    const encryptedPayload = await encrypt(payload, target, salt, localKeys)

    const headers = await createHeaders(
        options,
        encryptedPayload.byteLength,
        salt,
        localKeys.publicKey,
    )

    return new Request(target.endpoint, {
        body: encryptedPayload,
        headers,
        method: 'POST',
    })
}

async function createHeaders(
    options: WebPushOptions,
    payloadLength: number,
    salt: Uint8Array,
    localPublicKey: CryptoKey,
): Promise<Headers> {
    // create the header values
    const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localPublicKey)
    const localPublicKeyBase64 = base64ToUrlEncoding(localPublicKeyBuffer as ArrayBuffer)
    const jwk = vapidKeysToJsonWebKey(options.vapidDetails)
    const serverPublicKey = getPublicKeyFromJwk(jwk)
    const jwt = await sign(jwk, options.jwtData)
    // create the headers
    const headers = new Headers({
        Encryption: `salt=${base64ToUrlEncoding(salt)}`,
        'Crypto-Key': `dh=${localPublicKeyBase64}`,
        'Content-Length': payloadLength.toString(),
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        Authorization: `vapid t=${jwt}, k=${serverPublicKey}`,
    })
    // append the optional headers
    if (options.topic) {
        headers.append('Topic', options.topic)
    }
    if (options.ttl) {
        headers.append('TTL', options.ttl.toString())
    }
    if (options.urgency) {
        headers.append('Urgency', options.urgency)
    }
    // done
    return headers
}
