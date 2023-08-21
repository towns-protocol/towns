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
    encryptMessageForDevice,
    ensureOlmSessionsForDevices,
    getExistingOlmSessions,
    IEncryptedContent,
    IMegolmEncryptedContent,
    IOlmEncryptedContent,
    IOlmSessionResult,
    MEGOLM_ALGORITHM,
    OLM_ALGORITHM,
} from '../olmLib'
import { DeviceInfoMap } from '../deviceList'
import {
    MegolmSession,
    MembershipOp,
    ToDeviceMessage_KeyResponse,
    ToDeviceOp,
    UserPayload_ToDevice,
} from '@river/proto'
import { IChannelContent, IClearContent, RiverEvent } from '../../event'
import * as olmLib from '../olmLib'
import { IEventDecryptionResult, IncomingRoomKeyRequest } from '../crypto'
import { PlainMessage } from '@bufbuild/protobuf'

export interface IOutboundGroupSessionKey {
    chain_index: number
    key: string
}

export interface IOlmDevice<T = DeviceInfo> {
    userId: string
    deviceInfo: T
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

/**
 * Tests whether an encrypted content has a ciphertext.
 * Ciphertext can be a string or object depending on the content type {@link IEncryptedContent}.
 *
 * @param content - Encrypted content
 * @returns true: has ciphertext, else false
 */
const hasCiphertext = (content: IEncryptedContent): boolean => {
    return typeof content.ciphertext === 'string'
        ? !!content.ciphertext.length
        : !!Object.keys(content as IOlmEncryptedContent).length
}

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
    channelId: string
    algorithm: string
    extraSessionData: OlmGroupSessionExtraData
}

interface IMessage {
    type: string
    content: {
        algorithm: string
        channel_id: string
        sender_key?: string
        session_id: string
        session_key: string
        chain_index: number
    }
}

interface IPayload extends Partial<IMessage> {
    code?: string
    reason?: string
    channel_id?: string
    session_id?: string
    algorithm?: string
    sender_key?: string
}

interface SharedWithData {
    // The curve25519 device key of the device we shared with
    deviceKey: string
    // The message index of the ratchet we shared with that device
    messageIndex: number
}

interface IKeyForwardingMessage extends IMessage {
    type: 'm.forwarded_room_key'
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
    public constructor(public readonly sessionId: string, public readonly channelId: string) {
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

    /**
     * Determine if this session has been shared with devices which it shouldn't
     * have been.
     *
     * @param devicesInRoom - `userId -> {deviceId -> object}`
     *   devices we should shared the session with.
     *
     * @returns true if we have shared the session with devices which aren't
     * in devicesInRoom.
     */
    public sharedWithTooManyDevices(devicesInRoom: DeviceInfoMap): boolean {
        for (const [userId, devices] of this.sharedWithDevices) {
            if (!devicesInRoom.has(userId)) {
                dlog('Starting new megolm session because we shared with ' + userId)
                return true
            }

            for (const [deviceId] of devices) {
                if (!devicesInRoom.get(userId)?.get(deviceId)) {
                    dlog(
                        'Starting new megolm session because we shared with ' +
                            userId +
                            ':' +
                            deviceId,
                    )
                    return true
                }
            }
        }

        return false
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

    // Map of outbound sessions by session ID. Used if we need a particular
    // session (the session we're currently using to send is always obtained
    // using setupPromise).
    private outboundSessions: Record<string, OutboundSessionInfo> = {}
    // Map of outbound sessions by channel ID. Used to find existing sessions
    // to use by channelId.
    private outboundSessionsByChannelId: Map<string, OutboundSessionInfo> = new Map()

    private encryptionPreparation?: {
        promise: Promise<void>
        startTime: number
        cancel: () => void
    }

    protected readonly channelId: string
    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(params: IParams & Required<Pick<IParams, 'channelId'>>) {
        super(params)
        this.channelId = params.channelId
        this.logCall = dlog('csb:sdk:megolm').extend(`[${this.channelId} encryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[${this.channelId} encryption]:ERROR `)
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
        channelId: string,
        devicesInRoom: DeviceInfoMap,
        singleOlmCreationPhase = false,
    ): Promise<OutboundSessionInfo | null> {
        // takes the previous OutboundSessionInfo, and considers whether to create
        // a new one. Also shares the key with any (new) devices in the room.
        //
        // returns a promise which resolves once the keyshare is successful.
        const setup = async (
            oldSession: OutboundSessionInfo | null,
        ): Promise<OutboundSessionInfo> => {
            const session = await this.prepareSession(channelId, devicesInRoom, oldSession)

            await this.shareSession(channelId, devicesInRoom, singleOlmCreationPhase, session)

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
        channelId: string,
        devicesInRoom: DeviceInfoMap,
        session: OutboundSessionInfo | null,
    ): Promise<OutboundSessionInfo> {
        // history visibility changes do not prompt a new session

        // todo: implement session rotation logic
        // https://linear.app/hnt-labs/issue/HNT-1830/session-rotation-megolm

        let existingSession = session
        // if cached session is associated with a different channelId, don't use it
        if (existingSession && existingSession.channelId !== channelId) {
            existingSession = null
        }
        // try to use an existing session if we have one for the channel.
        if (this.outboundSessionsByChannelId.get(channelId)) {
            existingSession = this.outboundSessionsByChannelId.get(channelId)!
        }

        if (existingSession?.sharedWithTooManyDevices(devicesInRoom)) {
            // determine if we have shared with anyone we shouldn't have
            existingSession = null
        }

        // if we don't have a cached session at this point, create a new one
        if (!existingSession) {
            const newSession = await this.prepareNewSession(channelId)
            this.logCall(`Started new megolm session ${newSession.sessionId}`)
            this.outboundSessions[newSession.sessionId] = newSession
            this.outboundSessionsByChannelId.set(channelId, newSession)
            return newSession
        }

        return existingSession
    }

    private async shareSession(
        channelId: string,
        devicesInRoom: DeviceInfoMap,
        singleOlmCreationPhase: boolean,
        session: OutboundSessionInfo,
    ): Promise<void> {
        // now check if we need to share with any devices
        const shareMap: Record<string, DeviceInfo[]> = {}

        for (const [userId, userDevices] of devicesInRoom) {
            for (const [deviceId, deviceInfo] of userDevices) {
                const key = deviceInfo.getIdentityKey()
                if (key == this.olmDevice.deviceCurve25519Key) {
                    // don't bother sending to ourself
                    continue
                }

                if (!session.sharedWithDevices.get(userId)?.get(deviceId)) {
                    shareMap[userId] = shareMap[userId] || []
                    shareMap[userId].push(deviceInfo)
                }
            }
        }

        const key = this.olmDevice.getOutboundGroupSessionKey(session.sessionId)
        const payload: IPayload = {
            type: 'r.room.key',
            content: {
                algorithm: MEGOLM_ALGORITHM,
                channel_id: channelId,
                session_id: session.sessionId,
                session_key: key.key,
                chain_index: key.chain_index,
            },
        }
        const { devicesWithoutSessions, devicesWithSessions } = await getExistingOlmSessions(
            this.olmDevice,
            shareMap,
        )
        try {
            await Promise.all([
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
                    await this.shareKeyWithOlmSessions(session, key, payload, devicesWithSessions)
                    this.logCall('Shared keys with existing Olm sessions')
                })(),
                (async (): Promise<void> => {
                    const deviceList = Array.from(devicesWithoutSessions.entries())
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
                        key,
                        payload,
                        devicesWithoutSessions,
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
                                    key,
                                    payload,
                                    retryDevices,
                                    failedDevices,
                                )
                                this.logCall(
                                    'Shared keys (end phase 2) with devices without existing Olm sessions',
                                )
                            }

                            await this.notifyFailedOlmDevices(session, key, failedDevices)
                        })()
                    } else {
                        await this.notifyFailedOlmDevices(session, key, errorDevices)
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
    private async prepareNewSession(channelId: string): Promise<OutboundSessionInfo> {
        const sessionId = this.olmDevice.createOutboundGroupSession()
        // session key
        const key = this.olmDevice.getOutboundGroupSessionKey(sessionId)

        await this.olmDevice.addInboundGroupSession(
            channelId,
            this.olmDevice.deviceCurve25519Key!,
            [],
            sessionId,
            key.key,
            { doNotUseKey: this.olmDevice.deviceDoNotUseKey! },
            false,
        )

        // todo: implement backupManager process for backing up sessions in indexeddb and uncomment below.
        // see: https://linear.app/hnt-labs/issue/HNT-1831/backup-sessions-in-indexeddb
        // don't wait for it to complete
        // this.crypto.backupManager.backupGroupSession(this.olmDevice.deviceCurve25519Key!, sessionId)

        return new OutboundSessionInfo(sessionId, channelId)
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
        payload: IPayload,
    ): Promise<void> {
        return this.crypto
            .encryptAndSendToDevices(devices, payload)
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
     * Re-shares a megolm session key with devices if the key has already been
     * sent to them.
     *
     * @param senderKey - The key of the originating device for the session
     * @param sessionId - ID of the outbound session to share
     * @param userId - ID of the user who owns the target device
     * @param device - The target device
     */
    public async reshareKeyWithDevice(
        senderKey: string,
        sessionId: string,
        userId: string,
        channelId: string,
        device: DeviceInfo,
    ): Promise<void> {
        const obSessionInfo = this.outboundSessions[sessionId]
        if (!obSessionInfo) {
            this.logCall(`megolm session ${senderKey}|${sessionId} not found: not re-sharing keys`)
            return
        }

        // The chain index of the key we previously sent this device
        if (!obSessionInfo.sharedWithDevices.has(userId)) {
            this.logCall(
                `megolm session ${senderKey}|${sessionId} never shared with user ${userId}`,
            )
            return
        }
        const sessionSharedData = obSessionInfo.sharedWithDevices.get(userId)?.get(device.deviceId)
        if (sessionSharedData === undefined) {
            this.logCall(
                `megolm session ${senderKey}|${sessionId} never shared with device ${userId}:${device.deviceId}`,
            )
            return
        }

        if (sessionSharedData.deviceKey !== device.getIdentityKey()) {
            this.logCall(
                `Megolm session ${senderKey}|${sessionId} has been shared with device ${device.deviceId} but ` +
                    `with identity key ${
                        sessionSharedData.deviceKey
                    }. Key is now ${device.getIdentityKey()}!`,
            )
            return
        }

        // get the key from the inbound session: the outbound one will already
        // have been ratcheted to the next chain index.
        const key = await this.olmDevice.getInboundGroupSessionKey(
            channelId,
            senderKey,
            sessionId,
            sessionSharedData.messageIndex,
        )

        if (!key) {
            this.logCall(
                `No inbound session key found for megolm session ${senderKey}|${sessionId}: not re-sharing keys`,
            )
            return
        }

        await ensureOlmSessionsForDevices(
            this.olmDevice,
            this.baseApis,
            new Map([[userId, [device]]]),
        )

        const payload = {
            type: 'r.forwarded_room_key',
            content: {
                algorithm: MEGOLM_ALGORITHM,
                channel_id: channelId,
                session_id: sessionId,
                session_key: key.key,
                chain_index: key.chain_index,
                sender_key: senderKey,
            },
        }

        // note jterzis: should we add a uuid here to prevent replay attacks?
        const encryptedContent: IEncryptedContent = {
            algorithm: OLM_ALGORITHM,
            sender_key: this.olmDevice.deviceCurve25519Key!,
            ciphertext: {},
        }
        await encryptMessageForDevice(
            encryptedContent.ciphertext,
            this.userId,
            this.deviceId,
            this.olmDevice,
            userId,
            device,
            payload,
        )

        // note: should use a new op code for key re-shares, using Key Response for now.
        await this.baseApis.sendToDeviceMessage(
            userId,
            encryptedContent,
            ToDeviceOp.TDO_KEY_RESPONSE,
            false,
        )
        this.logCall(
            `Re-shared key for megolm session ${senderKey}|${sessionId} with ${userId}:${device.deviceId}`,
        )
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
        payload: IPayload,
        devicesByUser: Map<string, DeviceInfo[]>,
        errorDevices: IOlmDevice[],
    ): Promise<void> {
        const devicemap = await ensureOlmSessionsForDevices(
            this.olmDevice,
            this.baseApis,
            devicesByUser,
            false,
        )
        this.getDevicesWithoutSessions(devicemap, devicesByUser, errorDevices)
        await this.shareKeyWithOlmSessions(session, key, payload, devicemap)
    }

    private async shareKeyWithOlmSessions(
        session: OutboundSessionInfo,
        key: IOutboundGroupSessionKey,
        payload: IPayload,
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

        const unnotifiedFailedDevices =
            await this.baseApis.cryptoStore!.filterOutNotifiedErrorDevices(failedDevices)
        this.logCall(
            `Need to notify ${unnotifiedFailedDevices.length} failed devices which haven't been notified before`,
        )

        // send the notifications
        // note jterzis: do we need a differnt notification for failed olm sessions versus device blocks
        // which can occur in theory without a failure in session establishment ?
        //await this.notifyBlockedDevices(session, blockedMap)

        this.logCall(
            `Notified ${unnotifiedFailedDevices.length} devices we failed to create Olm sessions`,
        )
    }

    /**
     * Perform any background tasks that can be done before a message is ready to
     * send, in order to speed up sending of the message.
     *
     * @param room - the room the event is in
     * @returns A function that, when called, will stop the preparation
     */
    public prepareToEncrypt(channelId: string): () => void {
        if (this.encryptionPreparation != null) {
            // We're already preparing something, so don't do anything else.
            const elapsedTime = Date.now() - this.encryptionPreparation.startTime
            this.logCall(
                `Already started preparing to encrypt for this room ${elapsedTime}ms ago, skipping`,
            )
            return this.encryptionPreparation.cancel
        }

        this.logCall('Preparing to encrypt events')

        let cancelled = false
        const isCancelled = (): boolean => cancelled

        this.encryptionPreparation = {
            startTime: Date.now(),
            promise: (async (): Promise<void> => {
                try {
                    // Attempt to enumerate the devices in room, and gracefully
                    // handle cancellation if it occurs.
                    const getDevicesResult = await this.getDevicesInRoom(channelId, isCancelled)
                    if (getDevicesResult === null) return
                    const [devicesInRoom] = getDevicesResult

                    // Todo implement: Drop unknown devices.  When the message gets sent, we'll
                    // throw an error, but we'll still be prepared to send to the known
                    // devices.

                    this.logCall('Ensuring outbound megolm session')
                    await this.ensureOutboundSession(channelId, devicesInRoom, true)

                    this.logCall('Ready to encrypt events')
                } catch (e) {
                    this.logCall('Failed to prepare to encrypt events', e)
                } finally {
                    delete this.encryptionPreparation
                }
            })(),

            cancel: (): void => {
                // The caller has indicated that the process should be cancelled,
                // so tell the promise that we'd like to halt, and reset the preparation state.
                cancelled = true
                delete this.encryptionPreparation
            },
        }

        return this.encryptionPreparation.cancel
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encryptMessage(
        channelId: string,
        eventType: string,
        content: IClearContent,
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

        /**
         * When using in-room messages and the room has encryption enabled,
         * clients should ensure that encryption does not hinder the verification.
         */
        const devicesInRoomList = await this.getDevicesInRoom(channelId, (): boolean => false)
        if (devicesInRoomList === null) {
            throw new Error(`Failed to get devices in room ${channelId}`)
        }
        const [devicesInRoom] = devicesInRoomList

        // todo: check if any of these devices are not yet known to the user.
        // if so, warn the user so they can verify or ignore.

        const session = await this.ensureOutboundSession(channelId, devicesInRoom, true)
        const payloadJson = {
            channel_id: channelId,
            type: eventType,
            content: content,
        }

        if (session === null) {
            throw new Error(`No session found for room ${channelId}`)
        }
        const ciphertext = this.olmDevice.encryptGroupMessage(
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
     * @param forceDistributeToUnverified - if set to true will include the unverified devices
     * even if setting is set to block them (useful for verification)
     * @param isCancelled - will cause the procedure to abort early if and when it starts
     * returning `true`. If omitted, cancellation won't happen.
     *
     * @returns Promise which resolves to `null`, or an array whose
     *     first element is a {@link DeviceInfoMap} indicating
     *     the devices that messages should be encrypted to, and whose second
     *     element is a map from userId to deviceId to data indicating the devices
     *     that are in the room but that have been blocked.
     *     If `isCancelled` is provided and returns `true` while processing, `null`
     *     will be returned.
     *     If `isCancelled` is not provided, the Promise will never resolve to `null`.
     */
    private async getDevicesInRoom(
        channel_id: string,
        isCancelled?: () => boolean,
    ): Promise<null | [DeviceInfoMap]> {
        const stream = this.baseApis.stream(channel_id)
        if (!stream) {
            this.logError(`stream for room ${channel_id} not found`)
            return null
        }
        const members: string[] = Array.from(stream.view.getMemberships().joinedUsers)
        this.logCall(
            `Encrypting for users (shouldEncryptForInvitedMembers:`,
            members.map((u) => `${u} (${MembershipOp[MembershipOp.SO_JOIN]})`),
        )

        // We are happy to use a cached version here: we assume that if we already
        // have a list of the user's devices, then we already share an e2e room
        // with them, which means that they will have announced any new devices via
        // device_lists in their /sync response.  This cache should then be maintained
        // using all the device_lists changes and left fields.
        // See https://github.com/vector-im/element-web/issues/2305 for details.
        const devices = await this.baseApis.downloadKeys(members)
        if (!devices) {
            return null
        }

        if (isCancelled?.() === true) {
            return null
        }

        //const blocked = new Map<string, Map<string, IBlockedDevice>>()
        // not implemented yet: remove any blocked devices

        return [devices]
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
    private pendingEvents = new Map<string, Map<string, Set<RiverEvent>>>()

    // this gets stubbed out by the unit tests.
    private olmlib = olmLib

    protected readonly channelId: string
    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(
        params: DecryptionClassParams<IParams & Required<Pick<IParams, 'channelId'>>>,
    ) {
        super(params)
        this.channelId = params.channelId
        this.logCall = dlog('csb:sdk:megolm').extend(`[${this.channelId} decryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[${this.channelId} decryption]:ERROR `)
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decryptEvent(event: RiverEvent): Promise<IEventDecryptionResult> {
        const content = event.getWireContentChannel().content

        if (!content.sender_key || !content.session_id || !content.ciphertext) {
            throw new DecryptionError('MEGOLM_MISSING_FIELDS', 'Missing fields in input')
        }

        // we add the event to the pending list *before* we start decryption.
        //
        // then, if the key turns up while decryption is in progress (and
        // decryption fails), we will schedule a retry.
        // (fixes https://github.com/vector-im/element-web/issues/5001)
        this.addEventToPendingList(event)

        let res: IDecryptedGroupMessage | null
        try {
            res = await this.olmDevice.decryptGroupMessage(
                event.getChannelId()!,
                content.sender_key,
                content.session_id,
                content.ciphertext,
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
                    session: content.sender_key + '|' + content.session_id,
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
                    session: content.sender_key + '|' + content.session_id,
                },
            )
        }

        // Success. We can remove the event from the pending list, if
        // that hasn't already happened. However, if the event was
        // decrypted with an untrusted key, leave it on the pending
        // list so it will be retried if we find a trusted key later.
        if (!res.untrusted) {
            this.removeEventFromPendingList(event)
        }

        const payload = JSON.parse(res.result)
        // todo: tighten event type to avoid this
        // https://linear.app/hnt-labs/issue/HNT-1837/tighten-content-type-of-riverevent
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const channel_id = payload.channel_id as string

        // belt-and-braces check that the room id matches that indicated by the HS
        // (this is somewhat redundant, since the megolm session is scoped to the
        // room, so neither the sender nor a MITM can lie about the channel_id).
        if (channel_id !== event.getChannelId()) {
            throw new DecryptionError(
                'MEGOLM_BAD_ROOM',
                'Message intended for channel ' + channel_id,
            )
        }

        return {
            clearEvent: payload,
            senderCurve25519Key: res.senderKey,
        }
    }

    /**
     * Add an event to the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private addEventToPendingList(event: RiverEvent): void {
        const content = event.getWireContentChannel().content
        const senderKey = content.sender_key
        const sessionId = content.session_id
        if (!senderKey || !sessionId) {
            this.logError('addEventToPendingList called with missing senderKey or sessionId')
            return
        }
        if (!this.pendingEvents.has(senderKey)) {
            this.pendingEvents.set(senderKey, new Map<string, Set<RiverEvent>>())
        }
        const senderPendingEvents = this.pendingEvents.get(senderKey)!
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
    private removeEventFromPendingList(event: RiverEvent): void {
        const content = event.getWireContentChannel().content
        const senderKey = content.sender_key
        const sessionId = content.session_id
        if (!senderKey || !sessionId) {
            this.logError('removeEventToPendingList called with missing senderKey or sessionId')
            return
        }
        const senderPendingEvents = this.pendingEvents.get(senderKey)
        const pendingEvents = senderPendingEvents?.get(sessionId)
        if (!pendingEvents) {
            return
        }

        pendingEvents.delete(event)
        if (pendingEvents.size === 0) {
            senderPendingEvents!.delete(sessionId)
        }
        if (senderPendingEvents!.size === 0) {
            this.pendingEvents.delete(senderKey)
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
    private roomKeyFromEvent(event: RiverEvent): RoomKey | undefined {
        const senderKey = event.getSenderKey()
        const content = event.getContent()
        const extraSessionData: OlmGroupSessionExtraData = {}
        if (content?.content?.content?.case !== 'response') {
            this.logError('roomKeyFromEvent called with non-response to device type')
            return
        }
        const todevice_content = new ToDeviceMessage_KeyResponse(content.content.content.value)
        const session_key = todevice_content.sessions[0].sessionKey
        const session_id = todevice_content.sessions[0].sessionId
        const algorithm = todevice_content.sessions[0].algorithm
        if (!event.event.channel_id || !session_key || !session_id || !algorithm) {
            this.logError('key event is missing fields')
            return
        }

        if (!this.olmlib.isOlmEncrypted(event)) {
            this.logError('key event not properly encrypted')
            return
        }

        const roomKey: RoomKey = {
            senderKey: senderKey!,
            sessionId: session_id,
            sessionKey: session_key,
            extraSessionData,
            exportFormat: false,
            channelId: event.event.channel_id,
            algorithm: algorithm,
        }

        return roomKey
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
                roomKey.channelId,
                roomKey.senderKey,
                [],
                roomKey.sessionId,
                roomKey.sessionKey,
                {},
                roomKey.exportFormat,
                roomKey.extraSessionData,
            )

            // have another go at decrypting events sent with this session.
            if (
                await this.retryDecryption(
                    roomKey.senderKey,
                    roomKey.sessionId,
                    !roomKey.extraSessionData.untrusted,
                )
            ) {
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

    public async onRoomKeyEvent(event: RiverEvent): Promise<void> {
        const roomKey = this.roomKeyFromEvent(event)

        if (!roomKey) {
            return
        }

        await this.addRoomKey(roomKey)
    }

    /**
     * @param event - key event
     */
    public async onRoomKeyWithheldEvent(event: RiverEvent): Promise<void> {
        const content = event.getContent()
        const roomContent = content.content as Partial<IChannelContent>
        const senderKey = content.content.sender_key as string
        const sessionId = roomContent.session_id
        if (!sessionId) {
            this.logError('key event is missing session_id')
        }

        if (content.code !== 'r.no_olm') {
            await this.olmDevice.addInboundGroupSessionWithheld(
                event.event.channel_id ?? '',
                senderKey,
                sessionId ?? '',
                content.code ?? '',
                content.reason ?? '',
            )
        }

        // Having recorded the problem, retry decryption on any affected messages.
        // It's unlikely we'll be able to decrypt sucessfully now, but this will
        // update the error message.
        //
        if (sessionId) {
            await this.retryDecryption(senderKey, sessionId)
        } else {
            // no_olm messages aren't specific to a given megolm session, so
            // we trigger retrying decryption for all the messages from the sender's
            // key, so that we can update the error message to indicate the olm
            // session problem.
            await this.retryDecryptionFromSender(senderKey)
        }
    }

    public hasKeysForKeyRequest(keyRequest: IncomingRoomKeyRequest): Promise<boolean> {
        const body = keyRequest.requestBody
        if (!body) {
            this.logError('key request is missing requestBody')
            return Promise.resolve(false)
        }
        return this.olmDevice.hasInboundSessionKeys(
            body.channel_id,
            body.sender_key,
            body.session_id,
            // TODO: ratchet index
        )
    }

    /**
     * @param untrusted - whether the key should be considered as untrusted
     * @param source - where the key came from
     */
    public async importRoomKey(
        session: MegolmSession,
        { untrusted }: { untrusted?: boolean } = {},
    ): Promise<void> {
        const extraSessionData: OlmGroupSessionExtraData = {}
        if (untrusted || session.untrusted) {
            extraSessionData.untrusted = true
        }
        try {
            await this.olmDevice.addInboundGroupSession(
                session.channelId,
                session.senderKey,
                [],
                session.sessionId,
                session.sessionKey,
                // sender claimed keys not yet supported
                {} as Record<string, string>,
                true,
                extraSessionData,
            )
            // have another go at decrypting events sent with this session.
            await this.retryDecryption(
                session.senderKey,
                session.sessionId,
                !extraSessionData.untrusted,
            )
        } catch (e) {
            this.logError(`Error handling room key import: ${(<Error>e).message}`)
        }
    }

    /**
     * Have another go at decrypting events after we receive a key. Resolves once
     * decryption has been re-attempted on all events.
     *
     * @internal
     * @param forceRedecryptIfUntrusted - whether messages that were already
     *     successfully decrypted using untrusted keys should be re-decrypted
     *
     * @returns whether all messages were successfully
     *     decrypted with trusted keys
     */
    private async retryDecryption(
        senderKey: string,
        sessionId: string,
        forceRedecryptIfUntrusted?: boolean,
    ): Promise<boolean> {
        const senderPendingEvents = this.pendingEvents.get(senderKey)
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
                        forceRedecryptIfUntrusted,
                    })
                } catch (e) {
                    // don't die if something goes wrong
                }
            }),
        )

        // If decrypted successfully with trusted keys, they'll have
        // been removed from pendingEvents
        return !this.pendingEvents.get(senderKey)?.has(sessionId)
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

    private async buildKeyForwardingMessage(
        channelId: string,
        senderKey: string,
        sessionId: string,
    ): Promise<IKeyForwardingMessage> {
        const key = await this.olmDevice.getInboundGroupSessionKey(channelId, senderKey, sessionId)

        return {
            type: 'm.forwarded_room_key',
            content: {
                algorithm: MEGOLM_ALGORITHM,
                channel_id: channelId,
                sender_key: senderKey,
                session_id: sessionId,
                session_key: key!.key,
                chain_index: key!.chain_index,
            },
        }
    }

    public async sendSharedHistoryInboundSessions(
        channelId: string,
        devicesByUser: Map<string, DeviceInfo[]>,
    ): Promise<void> {
        await olmLib.ensureOlmSessionsForDevices(this.olmDevice, this.baseApis, devicesByUser)

        const sharedHistorySessions = await this.olmDevice.getSharedHistoryInboundGroupSessions(
            channelId,
        )
        this.logCall(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Sharing history in with users ${Array.from(devicesByUser.keys())}`,
            sharedHistorySessions.map(([senderKey, sessionId]) => `${senderKey}|${sessionId}`),
        )
        for (const [senderKey, sessionId] of sharedHistorySessions) {
            const payload = await this.buildKeyForwardingMessage(
                this.channelId,
                senderKey,
                sessionId,
            )

            // FIXME: use encryptAndSendToDevices() rather than duplicating it here.
            const promises: Promise<unknown>[] = []
            const contentMap: Map<string, Map<string, IEncryptedContent>> = new Map()
            for (const [userId, devices] of devicesByUser) {
                // contentMap map userId -> map deviceId -> content
                const deviceMessages = new Map<string, IEncryptedContent>()
                contentMap.set(userId, deviceMessages)
                for (const deviceInfo of devices) {
                    const encryptedContent: IEncryptedContent = {
                        algorithm: OLM_ALGORITHM,
                        sender_key: this.olmDevice.deviceCurve25519Key!,
                        ciphertext: {},
                    }
                    deviceMessages.set(deviceInfo.deviceId, encryptedContent)
                    promises.push(
                        olmLib.encryptMessageForDevice(
                            encryptedContent.ciphertext,
                            this.userId,
                            undefined,
                            this.olmDevice,
                            userId,
                            deviceInfo,
                            payload,
                        ),
                    )
                }
            }
            await Promise.all(promises)

            // prune out any devices that encryptMessageForDevice could not encrypt for,
            // in which case it will have just not added anything to the ciphertext object.
            // There's no point sending messages to devices if we couldn't encrypt to them,
            // since that's effectively a blank message.
            for (const [userId, deviceMessages] of contentMap) {
                for (const [deviceId, content] of deviceMessages) {
                    if (!hasCiphertext(content)) {
                        this.logCall(
                            'No ciphertext for device ' + userId + ':' + deviceId + ': pruning',
                        )
                        deviceMessages.delete(deviceId)
                    }
                }
                // No devices left for that user? Strip that too.
                if (deviceMessages.size === 0) {
                    this.logCall('Pruned all devices for user ' + userId)
                    contentMap.delete(userId)
                }
            }

            // Is there anything left?
            if (contentMap.size === 0) {
                this.logCall('No users left to send to: aborting')
                return
            }

            // node 07/26/23 jterzis: as of now we haven't implemented
            // multi-device model so we can send to each user as a proxy
            // for their devices. In the future well need to implement
            // multi-device and sendToDevice that takes in a deviceId as well.
            // see: https://linear.app/hnt-labs/issue/HNT-1839/multi-device-support-in-todevice-transport
            for (const [userId, deviceMessages] of contentMap) {
                for (const [_deviceId, content] of deviceMessages) {
                    await this.baseApis.sendToDeviceMessage(
                        userId,
                        {
                            algorithm: OLM_ALGORITHM,
                            ciphertext: content.ciphertext,
                        } as PlainMessage<UserPayload_ToDevice>['message'],
                        ToDeviceOp.TDO_KEY_RESPONSE,
                        false,
                    )
                }
            }
        }
    }
}
