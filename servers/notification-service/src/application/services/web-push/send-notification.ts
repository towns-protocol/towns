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
import { Provider, Notification } from '@parse/node-apn'
import { ApnsEndpoint } from '../../tagSchema'
import { notificationServiceLogger } from '../../logger'
import { database } from '../../prisma'

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
        notificationServiceLogger.error('Missing required VAPID environment variables', {
            userId: options.userId,
            channelId: options.channelId,
        })
        throw new Error('Missing required VAPID environment variables')
    }

    try {
        const subscription: WebPushSubscription = JSON.parse(subscribed.PushSubscription)
        if (!subscription) {
            notificationServiceLogger.error('cannot parse subscription', {
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
                channelId: options.channelId,
            })
            return {
                status: SendPushStatus.Error,
                message: 'cannot parse subscription',
                userId: options.userId,
                pushSubscription: subscribed.PushSubscription,
                statusCode: undefined,
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

        const response = await fetch(request)
        const status = response.status
        notificationServiceLogger.info('sendNotificationViaWebPush response', {
            status,
            userId: options.userId,
            channelId: options.channelId,
        })

        const success = status >= 200 && status <= 204

        if (status === 410 || status === 404) {
            notificationServiceLogger.warn('sendNotificationViaWebPush subscription not found', {
                userId: options.userId,
                channelId: options.channelId,
                status,
            })
            await deleteFailedSubscription(options.userId, subscribed.PushSubscription)
        }

        return {
            status: success ? SendPushStatus.Success : SendPushStatus.Error,
            userId: options.userId,
            pushSubscription: subscribed.PushSubscription,
            statusCode: status,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        notificationServiceLogger.error('sendNotificationViaWebPush exception', {
            error: e,
            message: e.message,
            stack: e.stack,
            channelId: options.channelId,
            userId: options.userId,
        })

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
            notificationServiceLogger.error('sendNotificationViaAPNS invalid APNS endpoint', {
                endpoint: subscription.endpoint,
                userId: options.userId,
                channel: options.channelId,
            })
            await deleteFailedSubscription(options.userId, subscribed.PushSubscription)
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
        notificationServiceLogger.info('sendNotificationViaAPNS response', {
            environment: subscription.endpoint,
            failed: response.failed,
            sent: response.sent,
            userId: options.userId,
            channel: options.channelId,
        })
        if (response.failed.length > 0) {
            if (response.failed.length > 1) {
                notificationServiceLogger.warn(
                    'sendNotificationViaAPNS multiple failed to send APNS notification',
                    {
                        failed: response.failed,
                        channelId: options.channelId,
                        userId: options.userId,
                    },
                )
            }
            // We only send one notification at a time
            if (response.failed[0].status === 410) {
                await deleteFailedSubscription(options.userId, subscribed.PushSubscription)
            }
            if (
                response.failed[0].status === 400 &&
                response.failed[0].response?.reason === 'BadDeviceToken'
            ) {
                await deleteFailedSubscription(options.userId, subscribed.PushSubscription)
            } else {
                notificationServiceLogger.error('failed to send APNS notification', {
                    failed: response.failed,
                    userId: options.userId,
                    channel: options.channelId,
                })
            }
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
        notificationServiceLogger.error('sendNotificationViaAPNS error', {
            err,
            userId: options.userId,
            channel: options.channelId,
        })

        return {
            status: SendPushStatus.Error,
            message: `Error sending APNS notification: ${err}`,
            userId: options.userId,
            pushSubscription: subscribed.PushSubscription,
        }
    }
}

async function deleteFailedSubscription(userId: string, pushSubscription: string): Promise<void> {
    notificationServiceLogger.warn(`deleting subscription from the db`, {
        pushSubscription: pushSubscription,
        userId: userId,
    })
    try {
        await database.pushSubscription.delete({
            where: {
                UserId: userId,
                PushSubscription: pushSubscription,
            },
        })
    } catch (err) {
        notificationServiceLogger.error('failed to delete subscription from the db', {
            err,
            userId: userId,
        })
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
    const localKeys = await crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveBits'],
    )

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
    const localPublicKeyBase64 = base64ToUrlEncoding(localPublicKeyBuffer)
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
