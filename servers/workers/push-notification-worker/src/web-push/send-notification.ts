import { SendPushResponse, SendPushStatus } from '../notify-users-handlers'
import {
  VapidDetails,
  WebPushOptions,
  WebPushSubscription,
} from './web-push-types'
import {
  encrypt,
  getPublicKeyFromJwk,
  sign,
  vapidKeysToJsonWebKey,
} from './crypto-utils'

import { Env } from 'index'
import { JwtData } from './jwt'
import { NotifyRequestParams } from '../request-interfaces'
import { QueryResultSubscription } from '../subscription-handlers'
import { base64ToUrlEncoding } from './utils'

export async function sendNotificationViaWebPush(
  userId: string,
  params: NotifyRequestParams,
  subscribed: QueryResultSubscription,
  env: Env,
): Promise<SendPushResponse> {
  const vapidDetails: VapidDetails = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }
  try {
    const subscription: WebPushSubscription = JSON.parse(
      subscribed.pushSubscription,
    )
    if (!subscription) {
      console.error('cannot parse subscription')
      return {
        status: SendPushStatus.Error,
        message: 'cannot parse subscription',
        userId,
        pushSubscription: subscribed.pushSubscription,
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
      payload: params.payload,
      channelId: params.channelId,
      topic: patchTopicToEnsureSpecCompliance(params.channelId),
      ttl,
      urgency: params.urgency ?? 'high',
    }

    // create the request to send to the push service
    const request = await createRequest(pushOptions, subscription)
    console.log('request url', request.url)

    const response = await fetch(request)
    const status = response.status
    console.log('sendNotificationViaWebPush response', {
      requestUrl: request.url,
      status: response.status,
      message: await response.text(),
      userId,
    })

    return {
      status:
        status >= 200 && status <= 204
          ? SendPushStatus.Success
          : SendPushStatus.Error,
      userId,
      pushSubscription: subscribed.pushSubscription,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.log(e)
    return {
      status: SendPushStatus.Error,
      message: e.message,
      userId,
      pushSubscription: subscribed.pushSubscription,
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
  const localPublicKeyBuffer = await crypto.subtle.exportKey(
    'raw',
    localPublicKey,
  )
  const localPublicKeyBase64 = base64ToUrlEncoding(
    localPublicKeyBuffer as ArrayBuffer,
  )
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
