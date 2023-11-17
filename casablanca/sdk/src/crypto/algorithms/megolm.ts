import type { IDecryptedGroupMessage, OlmGroupSessionExtraData } from '../olmDevice'
import { dlog, DLogger } from '../../dlog'

import {
    DecryptionAlgorithm,
    DecryptionClassParams,
    DecryptionError,
    EncryptionAlgorithm,
    IParams,
} from './base'
import { DeviceInfo } from '../deviceInfo'
import {
    ensureOlmSessionsForDevices,
    IEncryptedContent,
    IMegolmEncryptedContent,
    IOlmSessionResult,
    MEGOLM_ALGORITHM,
} from '../olmLib'
import { DeviceInfoMap, IOlmDevice } from '../deviceList'
import {
    ChannelMessage,
    KeyResponseKind,
    MegolmSession,
    MembershipOp,
    ToDeviceMessage,
} from '@river/proto'
import * as olmLib from '../olmLib'
import { ClearContent, RiverEventV2 } from '../../eventV2'
import { make_ToDevice_KeyResponse } from '../../types'
import { StreamStateView } from '../../streamStateView'

export interface IOutboundGroupSessionKey {
    chain_index: number
    key: string
}

/** Note Jterzis 07/26/23: Several features are intentionally left out of this module,
 * that we may want to implement in the future:
 * 1. Shared History - We don't have a concept of "shared history visibility settings" in River.
 * 2. Backup Manager - We do not backup session keys to anything other than client-side storage.
 * 3. Blocking Devices - We do not block devices and therefore do not account for blocked devices here.
 * 4. Key Forwarding - River does not support key forwarding sessions created by another user's device.
 * 5. Cross Signing - River does not support cross signing yet. Each device is verified individually at this time.
 * 6. Sessions Rotation - River does not support active or periodic session rotation yet.
 */

// todo jterzis: room -> channel
/** The result of parsing the an `r.room_key` to-device event */
interface RoomKey {
    /**
     * The Curve25519 key of the megolm session creator.
     *
     * For `r.room.key`, this is also the sender of the `r.room.key` to-device event.
     */
    senderKey: string
    sessionId: string
    sessionKey: string
    exportFormat: boolean
    streamId: string
    algorithm: string
    extraSessionData: OlmGroupSessionExtraData
}

interface SharedWithData {
    // The curve25519 device key of the device we shared with
    deviceKey: string
    // The message index of the ratchet we shared with that device
    messageIndex: number
}

/**
 * @internal
 */
class OutboundSessionInfo {
    /** number of times this session has been used */
    public useCount = 0
    /** when the session was created (ms since the epoch) */
    public creationTime: number
    /** devices with which we have shared the session key `userId -> {deviceId -> SharedWithData}` */
    public sharedWithDevices: Map<string, Map<string, SharedWithData>> = new Map()

    /**
     * @param sharedHistory - whether the session can be freely shared with
     *    other group members. Note jterzis: default to true as we don't have a concept
     *    of "shared history visibility settings" in River.
     */
    public constructor(public readonly sessionId: string, public readonly streamId: string) {
        this.creationTime = new Date().getTime()
    }

    /**
     * Check if it's time to rotate the session
     */
    public needsRotation(_rotationPeriodMsgs?: number, _rotationPeriodMs?: number): boolean {
        // todo: implement rotation logic based on session lifetime
        return false
    }

    public markSharedWithDevice(
        userId: string,
        deviceId: string,
        deviceKey: string,
        chain_index: number,
    ): void {
        const userMap = this.sharedWithDevices.get(userId)
        if (userMap !== undefined) {
            userMap.set(deviceId, { deviceKey, messageIndex: chain_index })
            return
        }
        this.sharedWithDevices.set(
            userId,
            new Map([[deviceId, { deviceKey, messageIndex: chain_index }]]),
        )
    }
}

/**
 * Megolm encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export class MegolmEncryption extends EncryptionAlgorithm {
    // the most recent attempt to set up a session. This is used to serialise
    // the session setups, so that we have a race-free view of which session we
    // are using, and which devices we have shared the keys with. It resolves
    // with an OutboundSessionInfo (or undefined, for the first message in the
    // room).
    private setupPromise = Promise.resolve<OutboundSessionInfo | null>(null)

    // Map of outbound sessions by stream ID. Used to find existing sessions
    // to use by channelId.
    private outboundSessionsByStreamId: Map<string, OutboundSessionInfo> = new Map()

    private encryptionPreparation?: {
        promise: Promise<void>
        startTime: number
        cancel: () => void
    }

    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(params: IParams) {
        super(params)
        this.logCall = dlog('csb:sdk:megolm').extend(`[encryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[encryption]:ERROR `)
    }

    /**
     * @internal
     *
     * @param devicesInRoom - The devices in this room, indexed by user ID
     * @param singleOlmCreationPhase - Only perform one round of olm
     *     session creation
     *
     * This method updates the setupPromise field of the class by chaining a new
     * call on top of the existing promise, and then catching and discarding any
     * errors that might happen while setting up the outbound group session. This
     * is done to ensure that `setupPromise` always resolves to `null` or the
     * `OutboundSessionInfo`.
     *
     * Using `>>=` to represent the promise chaining operation, it does the
     * following:
     *
     * ```
     * setupPromise = previousSetupPromise >>= setup >>= discardErrors
     * ```
     *
     * The initial value for the `setupPromise` is a promise that resolves to
     * `null`. The forceDiscardSession() resets setupPromise to this initial
     * promise.
     *
     * @returns Promise which resolves to the
     *    OutboundSessionInfo when setup is complete.
     */
    private async ensureOutboundSession(
        streamId: string,
        singleOlmCreationPhase = false,
    ): Promise<OutboundSessionInfo | null> {
        // takes the previous OutboundSessionInfo, and considers whether to create
        // a new one. Also shares the key with any (new) devices in the room.
        //
        // returns a promise which resolves once the keyshare is successful.
        const setup = async (
            oldSession: OutboundSessionInfo | null,
        ): Promise<OutboundSessionInfo> => {
            const session = await this.prepareSession(streamId, oldSession, singleOlmCreationPhase)

            return session
        }

        // todo: jterzis modify to await..async syntax
        // first wait for the previous share to complete
        const fallible = this.setupPromise.then(setup)

        // Ensure any failures are logged for debugging and make sure that the
        // promise chain remains unbroken
        //
        // setupPromise resolves to `null` or the `OutboundSessionInfo` whether
        // or not the share succeeds
        this.setupPromise = fallible.catch((e) => {
            this.logError(`Failed to setup outbound session`, e)
            return null
        })

        // but we return a promise which only resolves if the share was successful.
        return fallible
    }

    private async prepareSession(
        streamId: string,
        session: OutboundSessionInfo | null,
        singleOlmCreationPhase: boolean,
    ): Promise<OutboundSessionInfo> {
        // history visibility changes do not prompt a new session

        // todo: implement session rotation logic
        // https://linear.app/hnt-labs/issue/HNT-1830/session-rotation-megolm

        let existingSession = session
        // if cached session is associated with a different streamId, don't use it
        if (existingSession && existingSession.streamId == streamId) {
            return existingSession
        }
        // try to use an existing session if we have one for the channel.
        if (this.outboundSessionsByStreamId.get(streamId)) {
            existingSession = this.outboundSessionsByStreamId.get(streamId)!
        } else {
            // if we don't have a cached session at this point, create a new one
            const newSession = await this.prepareNewSession(streamId)
            this.logCall(`Started new megolm session ${newSession.sessionId}`)

            this.outboundSessionsByStreamId.set(streamId, newSession)

            await this.shareSession(streamId, singleOlmCreationPhase, newSession)
            return newSession
        }

        return existingSession
    }

    private async shareSession(
        streamId: string,
        singleOlmCreationPhase: boolean,
        session: OutboundSessionInfo,
    ): Promise<void> {
        // now check if we need to share with any devices
        const shareMap: Map<string, DeviceInfo[]> = new Map()

        const devicesInRoom = await this.getDevicesInRoom(streamId)
        if (devicesInRoom === null) {
            this.logCall(`No devices in room to share session for stream ${streamId}`)
            return
        }

        for (const [userId, userDevices] of devicesInRoom) {
            for (const [deviceId, deviceInfo] of userDevices) {
                if (deviceInfo.getIdentityKey() == this.olmDevice.deviceCurve25519Key) {
                    // don't bother sending to ourself
                    continue
                }

                if (!session.sharedWithDevices.get(userId)?.get(deviceId)) {
                    shareMap.set(userId, shareMap.get(userId) || [])
                    shareMap.get(userId)?.push(deviceInfo)
                }
            }
        }

        const sessionKey = await this.olmDevice.getOutboundGroupSessionKey(session.sessionId)
        const payload = new MegolmSession({
            streamId: streamId,
            sessionId: session.sessionId,
            sessionKey: sessionKey.key,
            algorithm: MEGOLM_ALGORITHM,
        })
        // share with all devicesInRoom so do not need to read existing Olm sessions.
        //const { devicesWithoutSessions, devicesWithSessions } = await getExistingOlmSessions(this.olmDevice, shareMap)
        try {
            await Promise.all([
                /*
                (async (): Promise<void> => {
                    // share keys with devices that we already have a session for
                    const olmSessionList = Array.from(devicesWithSessions.entries())
                        .map(([userId, sessionsByUser]) =>
                            Array.from(sessionsByUser.entries()).map(
                                ([deviceId, session]) =>
                                    `${userId}/${deviceId}: ${session.sessionId}`,
                            ),
                        )
                        .flat(1)
                    this.logCall(
                        'Sharing keys with devices with existing Olm sessions:',
                        olmSessionList,
                    )
                    await this.shareKeyWithOlmSessions(
                        session,
                        key,
                        streamId,
                        payload,
                        devicesWithSessions,
                    )
                    this.logCall('Shared keys with existing Olm sessions')
                })(),
                */
                (async (): Promise<void> => {
                    const deviceList = Array.from(shareMap.entries())
                        .map(([userId, devicesByUser]) =>
                            devicesByUser.map((device) => `${userId}/${device.deviceId}`),
                        )
                        .flat(1)
                    this.logCall(
                        'Sharing keys (start phase 1) with devices without existing Olm sessions:',
                        deviceList,
                    )
                    const errorDevices: IOlmDevice[] = []

                    // meanwhile, establish olm sessions for devices that we don't
                    // already have a session for, and share keys with them.  If
                    // we're doing two phases of olm session creation, use a
                    // shorter timeout when fetching one-time keys for the first
                    // phase.
                    const start = Date.now()
                    const failedServers: string[] = []
                    await this.shareKeyWithDevices(
                        session,
                        sessionKey,
                        streamId,
                        payload,
                        shareMap,
                        errorDevices,
                    )
                    this.logCall(
                        'Shared keys (end phase 1) with devices without existing Olm sessions',
                    )

                    if (!singleOlmCreationPhase && Date.now() - start < 10000) {
                        // perform the second phase of olm session creation if requested,
                        // and if the first phase didn't take too long
                        void (async (): Promise<void> => {
                            // Retry sending keys to devices that we were unable to establish
                            // an olm session for.  This time, we use a longer timeout, but we
                            // do this in the background and don't block anything else while we
                            // do this.  We only need to retry users from servers that didn't
                            // respond the first time.
                            const retryDevices: Map<string, DeviceInfo[]> = new Map<
                                string,
                                DeviceInfo[]
                            >()
                            const failedServerMap = new Set()
                            for (const server of failedServers) {
                                failedServerMap.add(server)
                            }
                            const failedDevices: IOlmDevice[] = []
                            for (const { userId, deviceInfo } of errorDevices) {
                                const userHS = userId.slice(userId.indexOf(':') + 1)
                                if (failedServerMap.has(userHS)) {
                                    if (retryDevices.has(userId)) {
                                        retryDevices.get(userId)?.push(deviceInfo)
                                    } else {
                                        retryDevices.set(userId, [deviceInfo])
                                    }
                                } else {
                                    // if we aren't going to retry, then handle it
                                    // as a failed device
                                    failedDevices.push({ userId, deviceInfo })
                                }
                            }

                            const retryDeviceList = Array.from(retryDevices.entries())
                                .map(([userId, devicesByUser]) =>
                                    devicesByUser.map((device) => `${userId}/${device.deviceId}`),
                                )
                                .flat(1)

                            if (retryDeviceList.length > 0) {
                                this.logCall(
                                    'Sharing keys (start phase 2) with devices without existing Olm sessions:',
                                    retryDeviceList,
                                )
                                await this.shareKeyWithDevices(
                                    session,
                                    sessionKey,
                                    streamId,
                                    payload,
                                    retryDevices,
                                    failedDevices,
                                )
                                this.logCall(
                                    'Shared keys (end phase 2) with devices without existing Olm sessions',
                                )
                            }

                            await this.notifyFailedOlmDevices(session, sessionKey, failedDevices)
                        })()
                    } else {
                        await this.notifyFailedOlmDevices(session, sessionKey, errorDevices)
                    }
                })(),
                // todo implement: also, notify newly blocked devices that they're blocked
            ])
        } catch (error) {
            this.logError('Error sharing keys', error)
            throw error
        }
    }

    /**
     * @internal
     *
     *
     * @returns session
     */
    private async prepareNewSession(streamId: string): Promise<OutboundSessionInfo> {
        const sessionId = await this.olmDevice.createOutboundGroupSession()
        // session key
        const key = await this.olmDevice.getOutboundGroupSessionKey(sessionId)

        await this.olmDevice.addInboundGroupSession(
            streamId,
            sessionId,
            key.key,
            { doNotUseKey: this.olmDevice.deviceDoNotUseKey! },
            false,
        )

        // todo: implement backupManager process for backing up sessions in indexeddb and uncomment below.
        // see: https://linear.app/hnt-labs/issue/HNT-1831/backup-sessions-in-indexeddb
        // don't wait for it to complete
        // this.crypto.backupManager.backupGroupSession(this.olmDevice.deviceCurve25519Key!, sessionId)

        return new OutboundSessionInfo(sessionId, streamId)
    }

    /**
     * Determines what devices in devicesByUser don't have an olm session as given
     * in devicemap.
     *
     * @internal
     *
     * @param deviceMap - the devices that have olm sessions, as returned by
     *     olmlib.ensureOlmSessionsForDevices.
     * @param devicesByUser - a map of user IDs to array of deviceInfo
     * @param noOlmDevices - an array to fill with devices that don't have
     *     olm sessions
     *
     * @returns an array of devices that don't have olm sessions.  If
     *     noOlmDevices is specified, then noOlmDevices will be returned.
     */
    private getDevicesWithoutSessions(
        deviceMap: Map<string, Map<string, IOlmSessionResult>>,
        devicesByUser: Map<string, DeviceInfo[]>,
        noOlmDevices: IOlmDevice[] = [],
    ): IOlmDevice[] {
        for (const [userId, devicesToShareWith] of devicesByUser) {
            const sessionResults = deviceMap.get(userId)

            for (const deviceInfo of devicesToShareWith) {
                const deviceId = deviceInfo.deviceId

                const sessionResult = sessionResults?.get(deviceId)
                if (!sessionResult?.sessionId) {
                    // no session with this device, probably because there
                    // were no one-time keys.

                    noOlmDevices.push({ userId, deviceInfo })
                    sessionResults?.delete(deviceId)

                    // ensureOlmSessionsForUsers has already done the logging,
                    // so just skip it.
                    continue
                }
            }
        }

        return noOlmDevices
    }

    /**
     * Splits the user device map into multiple chunks to reduce the number of
     * devices we encrypt to per API call.
     *
     * @internal
     *
     * @param devicesByUser - map from userid to list of devices
     *
     * @returns the blocked devices, split into chunks
     */
    private splitDevices<T extends DeviceInfo>(
        devicesByUser: Map<string, Map<string, { device: T }>>,
    ): IOlmDevice<T>[][] {
        const maxDevicesPerRequest = 20

        // use an array where the slices of a content map gets stored
        let currentSlice: IOlmDevice<T>[] = []
        const mapSlices = [currentSlice]

        for (const [userId, userDevices] of devicesByUser) {
            for (const deviceInfo of userDevices.values()) {
                currentSlice.push({
                    userId: userId,
                    deviceInfo: deviceInfo.device,
                })
            }

            // We do this in the per-user loop as we prefer that all messages to the
            // same user end up in the same API call to make it easier for the
            // server (e.g. only have to send one EDU if a remote user, etc). This
            // does mean that if a user has many devices we may go over the desired
            // limit, but its not a hard limit so that is fine.
            if (currentSlice.length > maxDevicesPerRequest) {
                // the current slice is filled up. Start inserting into the next slice
                currentSlice = []
                mapSlices.push(currentSlice)
            }
        }
        if (currentSlice.length === 0) {
            mapSlices.pop()
        }
        return mapSlices
    }

    /**
     * @internal
     *
     *
     * @param chain_index - current chain index
     *
     * @param userDeviceMap - mapping from userId to deviceInfo
     *
     * @param payload - fields to include in the encrypted payload
     *
     * @returns Promise which resolves once the key sharing
     *     for the given userDeviceMap is generated and has been sent.
     */
    private encryptAndSendKeysToDevices(
        session: OutboundSessionInfo,
        chain_index: number,
        devices: IOlmDevice[],
        streamId: string,
        payload: MegolmSession,
    ): Promise<void> {
        const toDeviceResponse = new ToDeviceMessage(
            make_ToDevice_KeyResponse({
                kind: KeyResponseKind.KRK_KEYS_FOUND,
                streamId: streamId,
                sessions: [payload],
            }),
        )
        return this.crypto
            .encryptAndSendToDevices(devices, toDeviceResponse)
            .then(() => {
                // store that we successfully uploaded the keys of the current slice
                for (const device of devices) {
                    session.markSharedWithDevice(
                        device.userId,
                        device.deviceInfo.deviceId,
                        device.deviceInfo.getIdentityKey(),
                        chain_index,
                    )
                }
            })
            .catch((error) => {
                this.logError('failed to encryptAndSendToDevices', error)
                throw error
            })
    }

    /**
     * @internal
     *
     * @param key - the session key as returned by
     *    OlmDevice.getOutboundGroupSessionKey
     *
     * @param payload - the base to-device message payload for sharing keys
     *
     * @param devicesByUser - map from userid to list of devices
     *
     * @param errorDevices - array that will be populated with the devices that we can't get an
     *    olm session for
     *
     */
    private async shareKeyWithDevices(
        session: OutboundSessionInfo,
        key: IOutboundGroupSessionKey,
        streamId: string,
        payload: MegolmSession,
        devicesByUser: Map<string, DeviceInfo[]>,
        _errorDevices: IOlmDevice[],
    ): Promise<void> {
        // start a new olm session rather than using an existing one
        const devicemap = await ensureOlmSessionsForDevices(
            this.olmDevice,
            this.baseApis,
            devicesByUser,
            true,
        )
        // we don't prune out errorDevices from devicemap so why call this ?
        //this.getDevicesWithoutSessions(devicemap, devicesByUser, errorDevices)
        await this.shareKeyWithOlmSessions(session, key, streamId, payload, devicemap)
    }

    private async shareKeyWithOlmSessions(
        session: OutboundSessionInfo,
        key: IOutboundGroupSessionKey,
        streamId: string,
        payload: MegolmSession,
        deviceMap: Map<string, Map<string, IOlmSessionResult>>,
    ): Promise<void> {
        const userDeviceMaps = this.splitDevices(deviceMap)
        const { chain_index } = { ...key }
        for (let i = 0; i < userDeviceMaps.length; i++) {
            const taskDetail = `megolm keys for ${session.sessionId} (slice ${i + 1}/${
                userDeviceMaps.length
            })`
            try {
                this.logCall(
                    `Sharing ${taskDetail}`,
                    userDeviceMaps[i].map((d) => `${d.userId}/${d.deviceInfo.deviceId}`),
                )
                await this.encryptAndSendKeysToDevices(
                    session,
                    chain_index,
                    userDeviceMaps[i],
                    streamId,
                    payload,
                )
                this.logCall(`Shared ${taskDetail}`)
            } catch (e) {
                this.logError(`Failed to share ${taskDetail}`)
                throw e
            }
        }
    }

    /**
     * Notify devices that we weren't able to create olm sessions.
     *
     *
     *
     * @param failedDevices - the devices that we were unable to
     *     create olm sessions for, as returned by shareKeyWithDevices
     */
    private async notifyFailedOlmDevices(
        session: OutboundSessionInfo,
        key: IOutboundGroupSessionKey,
        failedDevices: IOlmDevice[],
    ): Promise<void> {
        this.logCall(`Notifying ${failedDevices.length} devices we failed to create Olm sessions`)

        // mark the devices that failed as "handled" because we don't want to try
        // to claim a one-time-key for dead devices on every message.
        for (const { userId, deviceInfo } of failedDevices) {
            const deviceId = deviceInfo.deviceId

            session.markSharedWithDevice(
                userId,
                deviceId,
                deviceInfo.getIdentityKey(),
                key.chain_index,
            )
        }

        this.logCall(
            `Need to notify ${failedDevices.length} failed devices which haven't been notified before`,
        )

        // send the notifications
        // note jterzis: do we need a differnt notification for failed olm sessions versus device blocks
        // which can occur in theory without a failure in session establishment ?
        //await this.notifyBlockedDevices(session, blockedMap)
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encryptMessage(
        streamId: string,
        content: ChannelMessage,
    ): Promise<IMegolmEncryptedContent> {
        this.logCall('Starting to encrypt event')

        if (this.encryptionPreparation != null) {
            // If we started sending keys, wait for it to be done.
            try {
                await this.encryptionPreparation.promise
            } catch (e) {
                // ignore any errors -- if the preparation failed, we'll just
                // restart everything here
            }
        }

        if (!content.payload.case || !content.payload.value) {
            throw new Error(`Megolm: No content found`)
        }

        // todo: check if any of these devices are not yet known to the user.
        // if so, warn the user so they can verify or ignore.
        let type: string
        let encoded: string
        switch (content.payload.case) {
            case 'post': {
                const message = new ChannelMessage({
                    payload: {
                        case: content.payload.case,
                        value: content.payload.value,
                    },
                })
                encoded = message.toJsonString()
                type = 'channelMessage'
                break
            }
            case 'edit':
            case 'redaction':
            case 'reaction': {
                const message = new ChannelMessage({
                    payload: {
                        case: content.payload.case,
                        value: content.payload.value,
                    },
                })
                encoded = message.toJsonString()
                type = 'channelMessage'
                break
            }
        }

        const session = await this.ensureOutboundSession(streamId, true)
        const payloadJson = {
            channel_id: streamId,
            type: type,
            content: encoded,
        }

        if (session === null) {
            throw new Error(`No session found for room ${streamId}`)
        }
        const ciphertext = await this.olmDevice.encryptGroupMessage(
            session.sessionId,
            JSON.stringify(payloadJson),
        )
        const encryptedContent: IEncryptedContent = {
            algorithm: MEGOLM_ALGORITHM,
            sender_key: this.olmDevice.deviceCurve25519Key!,
            ciphertext: ciphertext,
            session_id: session.sessionId,
            // Include our device ID so that recipients can send us a
            // m.new_device message if they don't have our session key.
            // XXX: Do we still need this now that m.new_device messages
            // no longer exist since #483?
            device_id: this.deviceId,
        }

        session.useCount++
        return encryptedContent
    }

    /**
     * Forces the current outbound group session to be discarded such
     * that another one will be created next time an event is sent.
     *
     * This should not normally be necessary.
     */
    public forceDiscardSession(): void {
        this.setupPromise = this.setupPromise.then(() => null)
    }

    /**
     * Get the list of active devices for all users in the room
     *
     *
     * @returns Promise which resolves to `null`, or an array whose
     *     first element is a {@link DeviceInfoMap} indicating
     *     the devices that messages should be encrypted to, and whose second
     *     element is a map from userId to deviceId to data indicating the devices
     *     that are in the room but that have been blocked.
     */
    private async getDevicesInRoom(stream_id: string): Promise<null | DeviceInfoMap> {
        let stream: StreamStateView | undefined
        stream = this.baseApis.stream(stream_id)?.view
        if (!stream) {
            stream = await this.baseApis.getStream(stream_id)
        }
        if (!stream) {
            this.logError(`stream for room ${stream_id} not found`)
            return null
        }
        const members: string[] = Array.from(stream.getMemberships().joinedUsers)
        this.logCall(
            `Encrypting for users (shouldEncryptForInvitedMembers:`,
            members.map((u) => `${u} (${MembershipOp[MembershipOp.SO_JOIN]})`),
        )

        const devices = await this.baseApis.downloadKeys(members)
        if (!devices) {
            return null
        }

        return devices
    }
}

/**
 * Megolm decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class MegolmDecryption extends DecryptionAlgorithm {
    // events which we couldn't decrypt due to unknown sessions /
    // indexes, or which we could only decrypt with untrusted keys:
    // map from senderKey|sessionId to Set of RiverEvents
    private pendingEvents = new Map<string, Map<string, Set<RiverEventV2>>>()
    // this gets stubbed out by the unit tests.
    private olmlib = olmLib

    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(params: DecryptionClassParams<IParams>) {
        super(params)
        this.logCall = dlog('csb:sdk:megolm').extend(`[decryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[decryption]:ERROR `)
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decryptEvent(event: RiverEventV2): Promise<ClearContent> {
        const content = event.getWireContent()

        if (!content.senderKey || !content.sessionId || !content.text) {
            throw new DecryptionError('MEGOLM_MISSING_FIELDS', 'Missing fields in input')
        }

        // we add the event to the pending list *before* we start decryption.
        //
        // then, if the key turns up while decryption is in progress (and
        // decryption fails), we will schedule a retry.
        // (fixes https://github.com/vector-im/element-web/issues/5001)
        this.addEventToPendingListV2(event)

        let res: IDecryptedGroupMessage | null
        try {
            res = await this.olmDevice.decryptGroupMessage(
                event.getChannelId()!,
                content.sessionId,
                content.text,
                event.getId()!,
            )
        } catch (e) {
            if ((<Error>e).name === 'DecryptionError') {
                // re-throw decryption errors as-is
                throw e
            }

            let errorCode = 'OLM_DECRYPT_GROUP_MESSAGE_ERROR'

            if ((<Error>e).message.includes('OLM.UNKNOWN_MESSAGE_INDEX')) {
                // todo: request keys here
                errorCode = 'OLM_UNKNOWN_MESSAGE_INDEX'
            }

            throw new DecryptionError(
                errorCode,
                e instanceof Error ? e.message : 'Unknown Error: Error is undefined',
                {
                    session: content.senderKey + '|' + content.sessionId,
                },
            )
        }

        if (res === null) {
            // todo: implement backup
            //  We've got a message for a session we don't have.
            // try and get the missing key from the backup first
            //this.crypto.backupManager
            //    .queryKeyBackupRateLimited(event.getRoomId(), content.session_id)
            //    .catch(() => {})

            // (XXX: We might actually have received this key since we started
            // decrypting, in which case we'll have scheduled a retry, and this
            // request will be redundant. We could probably check to see if the
            // event is still in the pending list; if not, a retry will have been
            // scheduled, so we needn't send out the request here.)
            // todo: need to implement queued Key request process to request keys from here
            // this.requestKeysForEvent(event)

            throw new DecryptionError(
                'MEGOLM_UNKNOWN_INBOUND_SESSION_ID',
                "The sender's device has not sent us the keys for this message.",
                {
                    session: content.senderKey + '|' + content.sessionId,
                },
            )
        }

        // Success. We can remove the event from the pending list, if
        // that hasn't already happened. However, if the event was
        // decrypted with an untrusted key, leave it on the pending
        // list so it will be retried if we find a trusted key later.
        if (!res.untrusted) {
            this.removeEventFromPendingListV2(event)
        }

        const payload = JSON.parse(res.result)
        if (!isValidPayload(payload)) {
            throw new DecryptionError(
                'PROTOBUF_MISSING_INFORMATION',
                'unable to find required protobuf information',
            )
        }
        let clearEvent: ClearContent | undefined

        const type = payload.type
        const protoContent = payload.content
        if (type === 'channelMessage') {
            const message = ChannelMessage.fromJsonString(protoContent)
            clearEvent = { content: message, type }
        } else {
            throw new DecryptionError(
                'MEGOLM_UNKNOWN_MESSAGE_TYPE',
                'Unknown message type: ' + type,
            )
        }

        // todo: tighten event type to avoid this
        // https://linear.app/hnt-labs/issue/HNT-1837/tighten-content-type-of-riverevent
        const channel_id = payload.channel_id

        // belt-and-braces check that the room id matches that indicated by the HS
        // (this is somewhat redundant, since the megolm session is scoped to the
        // room, so neither the sender nor a MITM can lie about the channel_id).
        if (channel_id !== event.getChannelId()) {
            throw new DecryptionError(
                'MEGOLM_BAD_ROOM',
                'Message intended for channel ' + channel_id,
            )
        }

        if (!clearEvent) {
            throw new DecryptionError(
                'PROTOBUF_DECODING_FAILED',
                'unable to find matching protobuf for message type ' + type,
            )
        }

        return clearEvent
    }

    /**
     * Add an event to the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private addEventToPendingListV2(event: RiverEventV2): void {
        const content = event.getWireContent()
        const streamId = event.getStreamId()
        const sessionId = content.sessionId
        if (!streamId || !sessionId) {
            this.logError('addEventToPendingListV2 called with missing senderKey or sessionId')
            return
        }
        if (!this.pendingEvents.has(streamId)) {
            this.pendingEvents.set(streamId, new Map<string, Set<RiverEventV2>>())
        }
        const senderPendingEvents = this.pendingEvents.get(streamId)!
        if (!senderPendingEvents.has(sessionId)) {
            senderPendingEvents.set(sessionId, new Set())
        }
        senderPendingEvents.get(sessionId)?.add(event)
    }

    /**
     * Remove an event from the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private removeEventFromPendingListV2(event: RiverEventV2): void {
        const content = event.getWireContent()
        const streamId = event.getStreamId()
        const sessionId = content.sessionId
        if (!streamId || !sessionId) {
            this.logError('removeEventToPendingListV2 called with missing senderKey or sessionId')
            return
        }
        const senderPendingEvents = this.pendingEvents.get(streamId)
        const pendingEvents = senderPendingEvents?.get(sessionId)
        if (!pendingEvents) {
            return
        }

        pendingEvents.delete(event)
        if (pendingEvents.size === 0) {
            senderPendingEvents!.delete(sessionId)
        }
        if (senderPendingEvents!.size === 0) {
            this.pendingEvents.delete(streamId)
        }
    }

    /**
     * Parse a RoomKey out of an `r.room_key` event.
     *
     * @param event - the event containing the room key.
     *
     * @returns The `RoomKey` if it could be successfully parsed out of the
     * event.
     *
     * @internal
     *
     */
    private roomKeyFromEvent(_event: RiverEventV2): RoomKey | undefined {
        throw new Error('not implemented')
    }

    /**
     * Add the given room key to our store.
     *
     * @param roomKey - The room key that should be added to the store.
     *
     * @internal
     *
     */
    private async addRoomKey(roomKey: RoomKey): Promise<void> {
        try {
            await this.olmDevice.addInboundGroupSession(
                roomKey.streamId,
                roomKey.sessionId,
                roomKey.sessionKey,
                {},
                roomKey.exportFormat,
                roomKey.extraSessionData,
            )

            // have another go at decrypting events sent with this session.
            if (await this.retryDecryption(roomKey.streamId, roomKey.sessionId)) {
                // todo: implement key request receipts
                // https://linear.app/hnt-labs/issue/HNT-1838/implement-key-request-receipt-upon-key-receipt
                // cancel any outstanding room key requests for this session.
                // Only do this if we managed to decrypt every message in the
                // session, because if we didn't, we leave the other key
                // requests in the hopes that someone sends us a key that
                // includes an earlier index.
            }

            // don't wait for the keys to be backed up for the server
            // await this.crypto.backupManager.backupGroupSession(roomKey.senderKey, roomKey.sessionId)
        } catch (e) {
            this.logError(`Error handling m.room_key_event: ${(<Error>e).message}`)
        }
    }

    public async onRoomKeyEvent(event: RiverEventV2): Promise<void> {
        const roomKey = this.roomKeyFromEvent(event)

        if (!roomKey) {
            return
        }

        await this.addRoomKey(roomKey)
    }

    public hasKeysForKeyRequest(streamId: string, sessionId: string): Promise<boolean> {
        return this.olmDevice.hasInboundSessionKeys(
            streamId,
            sessionId,
            // TODO: ratchet index
        )
    }

    /**
     * @param streamId - the stream id of the session
     * @param session- the megolm session object
     */
    public async importRoomKey(streamId: string, session: MegolmSession): Promise<void> {
        const extraSessionData: OlmGroupSessionExtraData = {}
        try {
            await this.olmDevice.addInboundGroupSession(
                streamId,
                session.sessionId,
                session.sessionKey,
                // sender claimed keys not yet supported
                {} as Record<string, string>,
                false,
                extraSessionData,
            )
            // have another go at decrypting events sent with this session.
            await this.retryDecryption(session.streamId, session.sessionId)
        } catch (e) {
            this.logError(`Error handling room key import: ${(<Error>e).message}`)
        }
    }

    /**
     * Have another go at decrypting events after we receive a key. Resolves once
     * decryption has been re-attempted on all events.
     *
     * @internal
     *
     * @returns whether all messages were successfully
     *     decrypted with trusted keys
     */
    private async retryDecryption(streamId: string, sessionId: string): Promise<boolean> {
        const senderPendingEvents = this.pendingEvents.get(streamId)
        if (!senderPendingEvents) {
            return true
        }

        const pending = senderPendingEvents.get(sessionId)
        if (!pending) {
            return true
        }

        const pendingList = [...pending]
        this.logCall(
            'Retrying decryption on events:',
            pendingList.map((e) => `${e.getId()}`),
        )

        await Promise.all(
            pendingList.map(async (ev) => {
                try {
                    await ev.attemptDecryption(this.crypto, {
                        isRetry: true,
                    })
                } catch (e) {
                    // don't die if something goes wrong
                    this.logError(`Error retrying decryption: ${(<Error>e).message}`)
                }
            }),
        )

        // If decrypted successfully with trusted keys, they'll have
        // been removed from pendingEvents
        return !this.pendingEvents.get(streamId)?.has(sessionId)
    }

    public async retryDecryptionFromSender(senderKey: string): Promise<boolean> {
        const senderPendingEvents = this.pendingEvents.get(senderKey)
        if (!senderPendingEvents) {
            return true
        }

        this.pendingEvents.delete(senderKey)

        await Promise.all(
            [...senderPendingEvents].map(async ([_sessionId, pending]) => {
                await Promise.all(
                    [...pending].map(async (ev) => {
                        try {
                            await ev.attemptDecryption(this.crypto)
                        } catch (e) {
                            // don't die if something goes wrong
                        }
                    }),
                )
            }),
        )

        return !this.pendingEvents.has(senderKey)
    }
}

function isValidPayload(
    obj: unknown,
): obj is { content: string; type: string; channel_id: string } {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'content' in obj &&
        typeof obj.content === 'string' &&
        'type' in obj &&
        typeof obj.type === 'string' &&
        'channel_id' in obj &&
        typeof obj.channel_id === 'string'
    )
}
