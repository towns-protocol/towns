/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises, @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument*/

/**
 * Utilities common to Olm encryption
 */
import { dlog } from '../dlog'
import { OlmDevice } from './olmDevice'
import { DeviceInfo, ISignatures } from './deviceInfo'
import { Client, FallbackKeyResponse, IDownloadKeyRequest, IDownloadKeyResponse } from '../client'
import { FallbackKeys, Key } from '@towns/proto'
import { IFallbackKey } from '../types'
import { RiverEvent, RiverEventType } from '../event'

const log = dlog('csb:olmLib')

// Supported algorithms
enum Algorithm {
    Olm = 'm.olm.v1.curve25519-aes-sha2',
    Megolm = 'm.megolm.v1.aes-sha2',
}

/**
 * river algorithm tag for olm
 */
export const OLM_ALGORITHM = Algorithm.Olm

/**
 * river algorithm tag for megolm
 */
export const MEGOLM_ALGORITHM = Algorithm.Megolm

export interface IMessage {
    // 0 for pre-key messages, 1 for messages once an Olm session has been established
    type?: number
    body: string
}

export type OlmSessionsAllByUserDevice = {
    // userId -> []deviceInfo (devices without sessions)
    devicesWithoutSessions: Map<string, DeviceInfo[]>
    // userId -> deviceId -> IExistingOlmSession
    devicesWithSessions: Map<string, Map<string, IExistingOlmSession>>
}

// userId -> deviceId -> OlmSessionResult
export type OlmSessionsExistingByUsers = Map<string, Map<string, IOlmSessionResult>>

export interface IOlmEncryptedContent {
    algorithm: typeof OLM_ALGORITHM
    sender_key: string
    ciphertext: Record<string, IMessage>
}

export interface IMegolmEncryptedContent {
    algorithm: typeof MEGOLM_ALGORITHM
    sender_key: string
    session_id: string
    device_id: string
    ciphertext: string
}

export interface IOlmSessionResult {
    /** device info */
    device: DeviceInfo
    /** base64 olm session id; null if no session could be established */
    sessionId: string | null
}

interface IExistingOlmSession {
    device: DeviceInfo
    sessionId: string | null
}

export interface IObject {
    unsigned?: object
    signatures?: ISignatures
}

// equivalent type to IOneTimeKey which this module previously used
// TODO: normalize this with IFallbackKey
type FallbackKey = Omit<IFallbackKey, 'signatures'> & { signatures?: ISignatures }

export type IEncryptedContent = IOlmEncryptedContent | IMegolmEncryptedContent

/**
 * Ensure we have established olm sessions for the target devices.
 *
 * @param devicesByUser - map from userid to list of devices to ensure sessions for
 *
 * @param force - If true, establish a new session even if one
 *     already exists.
 *
 * @returns resolves once the sessions are complete, to
 *    an Object mapping from userId to deviceId to OlmSessionResult
 */
export async function ensureOlmSessionsForDevices(
    olmDevice: OlmDevice,
    baseApis: Client,
    devicesByUser: Map<string, DeviceInfo[]>,
    force = false,
): Promise<OlmSessionsExistingByUsers> {
    const devicesWithoutSession: [string, string][] = [
        // [userId, deviceId], ...
    ]
    // map user Id → device Id → IExistingOlmSession
    const result: Map<string, Map<string, IExistingOlmSession>> = new Map()
    // map device key → resolve session fn
    const resolveSession: Map<string, (sessionId?: string) => void> = new Map()

    // Mark all sessions this task intends to update as in progress. It is
    // important to do this for all devices this task cares about in a single
    // synchronous operation, as otherwise it is possible to have deadlocks
    // where multiple tasks wait indefinitely on another task to update some set
    // of common devices.
    for (const devices of devicesByUser.values()) {
        for (const deviceInfo of devices) {
            const key = deviceInfo.getIdentityKey()

            if (key === olmDevice.deviceCurve25519Key) {
                // We don't start sessions with ourself, so there's no need to
                // mark it in progress.
                continue
            }

            if (!olmDevice.sessionsInProgress[key]) {
                // pre-emptively mark the session as in-progress to avoid race
                // conditions.  If we find that we already have a session, then
                // we'll resolve
                olmDevice.sessionsInProgress[key] = new Promise((resolve) => {
                    resolveSession.set(key, (v: any): void => {
                        delete olmDevice.sessionsInProgress[key]
                        resolve(v)
                    })
                })
            }
        }
    }

    for (const [userId, devices] of devicesByUser) {
        const resultDevices = new Map()
        result.set(userId, resultDevices)

        for (const deviceInfo of devices) {
            const deviceId = deviceInfo.deviceId
            const key = deviceInfo.getIdentityKey()

            if (key === olmDevice.deviceCurve25519Key) {
                // We should never be trying to start a session with ourself.
                // Apart from talking to yourself being the first sign of madness,
                // olm sessions can't do this because they get confused when
                // they get a message and see that the 'other side' has started a
                // new chain when this side has an active sender chain.
                // If you see this message being logged in the wild, we should find
                // the thing that is trying to send Olm messages to itself and fix it.
                log('Attempted to start session with ourself! Ignoring')
                // We must fill in the section in the return value though, as callers
                // expect it to be there.
                resultDevices.set(deviceId, {
                    device: deviceInfo,
                    sessionId: null,
                })
                continue
            }

            const forWhom = `for ${key} (${userId}:${deviceId})`
            const sessionId = await olmDevice.getSessionIdForDevice(key, !!resolveSession.get(key))
            const resolveSessionFn = resolveSession.get(key)
            if (sessionId !== null && resolveSessionFn) {
                // we found a session, but we had marked the session as
                // in-progress, so resolve it now, which will unmark it and
                // unblock anything that was waiting
                resolveSessionFn()
            }
            if (sessionId === null || force) {
                if (force) {
                    log(`Forcing new Olm session ${forWhom}`)
                } else {
                    log(`Making new Olm session ${forWhom}`)
                }
                devicesWithoutSession.push([userId, deviceId])
            }
            resultDevices.set(deviceId, {
                device: deviceInfo,
                sessionId: sessionId,
            })
        }
    }

    if (devicesWithoutSession.length === 0) {
        return result
    }

    // We need to claim fallback keys before we can create new sessions
    // todo: we should really be using signed_curve25519 and verifying sig
    const fallbackKeyAlgorithm = 'curve25519'
    let res: Omit<IDownloadKeyResponse, 'device_keys'>
    let taskDetail = `fallback keys for ${devicesWithoutSession.length} devices`
    const fallbackKeyRequest: IDownloadKeyRequest = {}
    devicesWithoutSession.map(([userId, deviceId]) => {
        if (fallbackKeyRequest[userId] == undefined) {
            fallbackKeyRequest[userId] = {}
        }
        fallbackKeyRequest[userId][deviceId] = ''
    })
    try {
        log(`Fallback downloading ${taskDetail}`)
        res = await baseApis.downloadKeysForUsers(fallbackKeyRequest, true)
        log(`Fallback used ${taskDetail}`)
    } catch (e) {
        for (const resolver of resolveSession.values()) {
            resolver()
        }
        log(`Failed to download fallback ${taskDetail}`, e, devicesWithoutSession)
        throw e
    }

    const fbkResult: Record<string, FallbackKeyResponse[]> | undefined =
        res.fallback_keys || ({} as IDownloadKeyResponse['fallback_keys'])
    const promises: Promise<void>[] = []
    for (const [userId, devices] of devicesByUser) {
        if (!fbkResult) {
            log(`No fallback keys for ${userId}`)
            continue
        }
        // FallbackKeyResponse[]
        const fbksByDevice = fbkResult[userId] || {}
        for (const deviceInfo of devices) {
            const deviceId = deviceInfo.deviceId
            const key = deviceInfo.getIdentityKey()

            if (key === olmDevice.deviceCurve25519Key) {
                // We've already logged about this above. Skip here too
                // otherwise we'll log saying there are no one-time keys
                // which will be confusing.
                continue
            }

            if (result.get(userId)?.get(deviceId)?.sessionId && !force) {
                // we already have a result for this device
                continue
            }
            const deviceFbkKeys: FallbackKeys[] = []
            for (const fbk of fbksByDevice) {
                if (fbk[deviceId]) {
                    deviceFbkKeys.push(fbk[deviceId])
                }
            }
            // find first fallback key that matches our desired algorithm
            let fallbackKey: FallbackKey | undefined = undefined
            for (const fbk of deviceFbkKeys) {
                Object.keys(fbk.algoKeyId).forEach((keyId) => {
                    const [algo, device_id] = keyId.split(':').map((str) => str.trim())
                    if (algo === fallbackKeyAlgorithm && device_id === deviceId) {
                        // match
                        const matchingKey: Key = fbk.algoKeyId[keyId]
                        if (!fallbackKey) {
                            fallbackKey = {} as FallbackKey
                        }
                        fallbackKey['key'] = matchingKey.key
                        fallbackKey['signatures'] = {
                            [deviceId]: matchingKey.signatures,
                        } as ISignatures
                    }
                })
                if (fallbackKey) {
                    break
                }
            }

            if (!fallbackKey) {
                log(
                    `No one-time keys (alg=${fallbackKeyAlgorithm}) ` +
                        `for device ${userId}:${deviceId}`,
                )
                resolveSession.get(key)?.()
                continue
            }

            // todo jterzis 06/23: refactor to use await...async and ensure in flight promise
            // is cleaned up on shutdown
            promises.push(
                _verifyKeyAndStartSession(olmDevice, fallbackKey, userId, deviceInfo).then(
                    (sid) => {
                        resolveSession.get(key)?.(sid ?? undefined)
                        const deviceInfo = result.get(userId)?.get(deviceId)
                        if (deviceInfo) deviceInfo.sessionId = sid
                    },
                    (e) => {
                        resolveSession.get(key)?.()
                        throw e
                    },
                ),
            )
        }
    }

    taskDetail = `Olm sessions for ${promises.length} devices`
    log(`Starting ${taskDetail}`)
    await Promise.all(promises)
    log(`Started ${taskDetail}`)
    return result
}

async function _verifyKeyAndStartSession(
    olmDevice: OlmDevice,
    fallbackKey: FallbackKey,
    userId: string,
    deviceInfo: DeviceInfo,
): Promise<string | null> {
    const deviceId = deviceInfo.deviceId
    try {
        await verifySignature(olmDevice, fallbackKey, userId, deviceId, deviceInfo.getFingerprint())
    } catch (e) {
        log(
            'Unable to verify signature on fallback key for device ' +
                userId +
                ':' +
                deviceId +
                ':',
            e,
        )
    }

    let sid
    try {
        sid = await olmDevice.createOutboundSession(deviceInfo.getIdentityKey(), fallbackKey.key)
    } catch (e) {
        // possibly a bad key
        log(`Error starting olm session with device ${userId} : ${deviceId} : ${JSON.stringify(e)}`)
        return null
    }

    log('Started new olm sessionid ' + sid + ' for device ' + userId + ':' + deviceId)
    return sid
}

/**
 * Verify the signature on an object using signing key.
 * Note: ed25519 key is deprecated. We should use TDK to sign
 * and verify objects and fallback key here.
 *
 * @param olmDevice - olm wrapper to use for verify op
 *
 * @param obj - object to check signature on.
 *
 * @param signingUserId -  ID of the user whose signature should be checked
 *
 * @param signingDeviceId -  ID of the device whose signature should be checked
 *
 * @param signingKey -   base64-ed ed25519 public key
 *
 * Returns a promise which resolves (to undefined) if the the signature is good,
 * or rejects with an Error if it is bad.
 */
export async function verifySignature(
    olmDevice: OlmDevice,
    obj: FallbackKey | IObject,
    signingUserId: string,
    signingDeviceId: string,
    signingKey: string,
): Promise<void> {
    // todo: replace with TDK as signing key
    // https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
    const signKeyId = 'donotuse:' + signingDeviceId
    const signatures = obj.signatures || {}
    const userSigs = signatures[signingUserId] || {}
    const signature = userSigs[signKeyId]
    if (!signature) {
        throw Error('No signature')
    }

    // prepare the canonical json: remove unsigned and signatures, and stringify with anotherjson
    const mangledObj = Object.assign({}, obj)
    if ('unsigned' in mangledObj) {
        delete mangledObj.unsigned
    }
    delete mangledObj.signatures
    // jterzis: do we need to use anotherjson lib here instead ?
    const json = JSON.stringify(mangledObj)

    // todo: replace olm based verification that verifies signature originating
    // from now deprecated ed25519 key with TDK based signature verification
    // https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
    olmDevice.verifySignature(signingKey, json, signature)
}

/**
 * Encrypt an event payload for an Olm device
 *
 * @param resultsObject -  The `ciphertext` property
 *   of the m.room.encrypted event to which to add our result
 *
 * @param olmDevice - olm.js wrapper
 * @param payloadFields - fields to include in the encrypted payload
 *
 * Returns a promise which resolves (to undefined) when the payload
 *    has been encrypted into `resultsObject`
 */
export async function encryptMessageForDevice(
    resultsObject: Record<string, IMessage>,
    ourUserId: string,
    ourDeviceId: string | undefined,
    olmDevice: OlmDevice,
    recipientUserId: string,
    recipientDevice: DeviceInfo,
    payloadFields: Record<string, any>,
): Promise<void> {
    const deviceKey = recipientDevice.getIdentityKey()
    const sessionId = await olmDevice.getSessionIdForDevice(deviceKey)
    if (sessionId === null) {
        // If we don't have a session for a device then
        // we can't encrypt a message for it.
        log(
            `[olmlib.encryptMessageForDevice] Unable to find Olm session for device ` +
                `${recipientUserId}:${recipientDevice.deviceId}`,
        )
        return
    }

    log(
        `[olmlib.encryptMessageForDevice] Using Olm session ${sessionId} for device ` +
            `${recipientUserId}:${recipientDevice.deviceId}`,
    )

    const payload = {
        sender: ourUserId,
        sender_device: ourDeviceId,

        // Include the Ed25519 key so that the recipient knows what
        // device this message came from.
        // We don't need to include the curve25519 key since the
        // recipient will already know this from the olm headers.
        // When combined with the device keys retrieved from the
        // homeserver signed by the ed25519 key this proves that
        // the curve25519 key and the ed25519 key are owned by
        // the same device.
        keys: {
            donotuse: olmDevice.deviceDoNotUseKey,
        },

        // include the recipient device details in the payload,
        // to avoid unknown key attacks, per
        // https://github.com/vector-im/vector-web/issues/2483
        recipient: recipientUserId,
        recipient_keys: {
            donotuse: recipientDevice.getFingerprint(),
        },
        ...payloadFields,
    }

    // TODO: technically, a bunch of that stuff only needs to be included for
    // pre-key messages: after that, both sides know exactly which devices are
    // involved in the session. If we're looking to reduce data transfer in the
    // future, we could elide them for subsequent messages.

    resultsObject[deviceKey] = await olmDevice.encryptMessage(
        deviceKey,
        sessionId,
        JSON.stringify(payload),
    )
}

/**
 * Get the existing olm sessions for the given devices, and the devices that
 * don't have olm sessions.
 *
 * @param devicesByUser - map from userid to list of devices to ensure sessions for
 *
 * @returns resolves to an array.  The first element of the array is a
 *    a map of user IDs to arrays of deviceInfo, representing the devices that
 *    don't have established olm sessions.  The second element of the array is
 *    a map from userId to deviceId to {@link OlmSessionResult}
 */
export async function getExistingOlmSessions(
    olmDevice: OlmDevice,
    devicesByUser: Record<string, DeviceInfo[]>,
): Promise<OlmSessionsAllByUserDevice> {
    // map user Id → DeviceInfo[]
    const devicesWithoutSessions: Map<string, DeviceInfo[]> = new Map()
    // map user Id → device Id → IExistingOlmSession
    const devicesWithSessions: Map<string, Map<string, IExistingOlmSession>> = new Map()

    const promises: Promise<void>[] = []

    for (const [userId, devices] of Object.entries(devicesByUser)) {
        for (const deviceInfo of devices) {
            const deviceId = deviceInfo.deviceId
            const key = deviceInfo.getIdentityKey()
            promises.push(
                (async (): Promise<void> => {
                    const sessionId = await olmDevice.getSessionIdForDevice(key, true)
                    if (sessionId === null) {
                        const devicesMap = devicesWithoutSessions.get(userId)
                        if (devicesMap !== undefined) {
                            devicesMap.push(deviceInfo)
                        }
                    } else {
                        const sessionsMap = devicesWithSessions.get(userId)
                        if (sessionsMap !== undefined) {
                            sessionsMap.set(deviceId, {
                                device: deviceInfo,
                                sessionId: sessionId,
                            })
                        }
                    }
                })(),
            )
        }
    }

    await Promise.all(promises)

    return { devicesWithoutSessions, devicesWithSessions }
}

/**
 * Check that an event was encrypted using olm.
 */
export function isOlmEncrypted(event: RiverEvent): boolean {
    if (!event.getSenderKey()) {
        dlog('Event has no sender key (not encrypted?)')
        return false
    }
    if (
        event.getWireType() !== RiverEventType.Encrypted ||
        ![OLM_ALGORITHM].includes(event.getWireContent().algorithm)
    ) {
        dlog('Event was not encrypted using an appropriate algorithm')
        return false
    }
    return true
}
