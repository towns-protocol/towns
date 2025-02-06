import TypedEmitter from 'typed-emitter'
import { Permission } from '@river-build/web3'
import {
    AddEventResponse_Error,
    EncryptedData,
    SessionKeys,
    UserInboxPayload_GroupEncryptionSessions,
} from '@river-build/proto'
import {
    shortenHexString,
    dlog,
    dlogError,
    DLogger,
    check,
    bin_toHexString,
} from '@river-build/dlog'
import {
    GroupEncryptionAlgorithmId,
    GroupEncryptionSession,
    parseGroupEncryptionAlgorithmId,
    UserDevice,
} from './olmLib'
import { GroupEncryptionCrypto } from './groupEncryptionCrypto'

export interface EntitlementsDelegate {
    isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean>
}

export enum DecryptionStatus {
    initializing = 'initializing',
    updating = 'updating',
    working = 'working',
    idle = 'idle',
    done = 'done',
}

export type DecryptionEvents = {
    decryptionExtStatusChanged: (status: DecryptionStatus) => void
}

export interface NewGroupSessionItem {
    streamId: string
    sessions: UserInboxPayload_GroupEncryptionSessions
}

export interface EncryptedContentItem {
    streamId: string
    eventId: string
    kind: string // kind of encrypted data
    encryptedData: EncryptedData
}

export interface KeySolicitationContent {
    deviceKey: string
    fallbackKey: string
    isNewDevice: boolean
    sessionIds: string[]
    srcEventId: string
}

export interface KeySolicitationItem {
    streamId: string
    fromUserId: string
    fromUserAddress: Uint8Array
    solicitation: KeySolicitationContent
    respondAfter: number // ms since epoch
}

export interface KeySolicitationData {
    streamId: string
    isNewDevice: boolean
    missingSessionIds: string[]
}

export interface KeyFulfilmentData {
    streamId: string
    userAddress: Uint8Array
    deviceKey: string
    sessionIds: string[]
}

export interface GroupSessionsData {
    streamId: string
    item: KeySolicitationItem
    sessions: GroupEncryptionSession[]
    algorithm: GroupEncryptionAlgorithmId
}

export interface DecryptionSessionError {
    missingSession: boolean
    kind: string
    encryptedData: EncryptedData
    error?: unknown
}

class StreamTasks {
    encryptedContent = new Array<EncryptedContentItem>()
    keySolicitations = new Array<KeySolicitationItem>()
    isMissingKeys = false
    keySolicitationsNeedsSort = false
    sortKeySolicitations() {
        this.keySolicitations.sort((a, b) => a.respondAfter - b.respondAfter)
        this.keySolicitationsNeedsSort = false
    }
    isEmpty() {
        return (
            this.encryptedContent.length === 0 &&
            this.keySolicitations.length === 0 &&
            !this.isMissingKeys
        )
    }
}

class StreamQueues {
    streams = new Map<string, StreamTasks>()
    getStreamIds() {
        return Array.from(this.streams.keys())
    }
    getQueue(streamId: string) {
        let tasks = this.streams.get(streamId)
        if (!tasks) {
            tasks = new StreamTasks()
            this.streams.set(streamId, tasks)
        }
        return tasks
    }
    isEmpty() {
        for (const tasks of this.streams.values()) {
            if (!tasks.isEmpty()) {
                return false
            }
        }
        return true
    }
    toString() {
        const counts = Array.from(this.streams.entries()).reduce((acc, [_, tasks]) => {
            acc['encryptedContent'] = (acc['encryptedContent'] ?? 0) + tasks.encryptedContent.length
            acc['missingKeys'] = (acc['missingKeys'] ?? 0) + (tasks.isMissingKeys ? 1 : 0)
            acc['keySolicitations'] = (acc['keySolicitations'] ?? 0) + tasks.keySolicitations.length
            return acc
        }, {} as Record<string, number>)

        return Object.entries(counts)
            .map(([key, count]) => `${key}: ${count}`)
            .join(', ')
    }
}
/**
 *
 * Responsibilities:
 * 1. Download new to-device messages that happened while we were offline
 * 2. Decrypt new to-device messages
 * 3. Decrypt encrypted content
 * 4. Retry decryption failures, request keys for failed decryption
 * 5. Respond to key solicitations
 *
 *
 * Notes:
 * If in the future we started snapshotting the eventNum of the last message sent by every user,
 * we could use that to determine the order we send out keys, and the order that we reply to key solicitations.
 *
 * It should be easy to introduce a priority stream, where we decrypt messages from that stream first, before
 * anything else, so the messages show up quicky in the ui that the user is looking at.
 *
 * We need code to purge bad sessions (if someones sends us the wrong key, or a key that doesn't decrypt the message)
 */
export abstract class BaseDecryptionExtensions {
    private _status: DecryptionStatus = DecryptionStatus.initializing
    private mainQueues = {
        priorityTasks: new Array<() => Promise<void>>(),
        newGroupSession: new Array<NewGroupSessionItem>(),
        ownKeySolicitations: new Array<KeySolicitationItem>(),
    }
    private streamQueues = new StreamQueues()
    private upToDateStreams = new Set<string>()
    private highPriorityIds: Set<string> = new Set()
    private decryptionFailures: Record<string, Record<string, EncryptedContentItem[]>> = {} // streamId: sessionId: EncryptedContentItem[]
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private delayMs: number = 1
    private started: boolean = false
    private emitter: TypedEmitter<DecryptionEvents>

    protected _onStopFn?: () => void
    protected log: {
        debug: DLogger
        info: DLogger
        error: DLogger
    }

    public readonly crypto: GroupEncryptionCrypto
    public readonly entitlementDelegate: EntitlementsDelegate
    public readonly userDevice: UserDevice
    public readonly userId: string

    public constructor(
        emitter: TypedEmitter<DecryptionEvents>,
        crypto: GroupEncryptionCrypto,
        entitlementDelegate: EntitlementsDelegate,
        userDevice: UserDevice,
        userId: string,
        upToDateStreams: Set<string>,
    ) {
        this.emitter = emitter
        this.crypto = crypto
        this.entitlementDelegate = entitlementDelegate
        this.userDevice = userDevice
        this.userId = userId
        // initialize with a set of up-to-date streams
        // ready for processing
        this.upToDateStreams = upToDateStreams

        const logId = generateLogId(userId, userDevice.deviceKey)
        this.log = {
            debug: dlog('csb:decryption:debug', { defaultEnabled: false }).extend(logId),
            info: dlog('csb:decryption', { defaultEnabled: true }).extend(logId),
            error: dlogError('csb:decryption:error').extend(logId),
        }
        this.log.debug('new DecryptionExtensions', { userDevice })
    }
    // todo: document these abstract methods
    public abstract ackNewGroupSession(
        session: UserInboxPayload_GroupEncryptionSessions,
    ): Promise<void>
    public abstract decryptGroupEvent(
        streamId: string,
        eventId: string,
        kind: string,
        encryptedData: EncryptedData,
    ): Promise<void>
    public abstract downloadNewMessages(): Promise<void>
    public abstract getKeySolicitations(streamId: string): KeySolicitationContent[]
    public abstract hasStream(streamId: string): boolean
    public abstract hasUnprocessedSession(item: EncryptedContentItem): boolean
    public abstract isUserEntitledToKeyExchange(
        streamId: string,
        userId: string,
        opts?: { skipOnChainValidation: boolean },
    ): Promise<boolean>
    public abstract isValidEvent(
        streamId: string,
        eventId: string,
    ): { isValid: boolean; reason?: string }
    public abstract isUserInboxStreamUpToDate(upToDateStreams: Set<string>): boolean
    public abstract onDecryptionError(item: EncryptedContentItem, err: DecryptionSessionError): void
    public abstract sendKeySolicitation(args: KeySolicitationData): Promise<void>
    public abstract sendKeyFulfillment(
        args: KeyFulfilmentData,
    ): Promise<{ error?: AddEventResponse_Error }>
    public abstract encryptAndShareGroupSessions(args: GroupSessionsData): Promise<void>
    public abstract shouldPauseTicking(): boolean
    /**
     * uploadDeviceKeys
     * upload device keys to the server
     */
    public abstract uploadDeviceKeys(): Promise<void>
    public abstract getPriorityForStream(streamId: string, highPriorityIds: Set<string>): number

    public enqueueNewGroupSessions(
        sessions: UserInboxPayload_GroupEncryptionSessions,
        _senderId: string,
    ): void {
        this.log.debug('enqueueNewGroupSessions', sessions)
        const streamId = bin_toHexString(sessions.streamId)
        this.mainQueues.newGroupSession.push({ streamId, sessions })
        this.checkStartTicking()
    }

    public enqueueNewEncryptedContent(
        streamId: string,
        eventId: string,
        kind: string, // kind of encrypted data
        encryptedData: EncryptedData,
    ): void {
        this.streamQueues.getQueue(streamId).encryptedContent.push({
            streamId,
            eventId,
            kind,
            encryptedData,
        })
        this.checkStartTicking()
    }

    public enqueueInitKeySolicitations(
        streamId: string,
        members: {
            userId: string
            userAddress: Uint8Array
            solicitations: KeySolicitationContent[]
        }[],
    ): void {
        const streamQueue = this.streamQueues.getQueue(streamId)
        streamQueue.keySolicitations = []
        this.mainQueues.ownKeySolicitations = this.mainQueues.ownKeySolicitations.filter(
            (x) => x.streamId !== streamId,
        )
        for (const member of members) {
            const { userId: fromUserId, userAddress: fromUserAddress } = member
            for (const keySolicitation of member.solicitations) {
                if (keySolicitation.deviceKey === this.userDevice.deviceKey) {
                    continue
                }
                if (!keySolicitation.isNewDevice || keySolicitation.sessionIds.length === 0) {
                    continue
                }
                const selectedQueue =
                    fromUserId === this.userId
                        ? this.mainQueues.ownKeySolicitations
                        : streamQueue.keySolicitations
                selectedQueue.push({
                    streamId,
                    fromUserId,
                    fromUserAddress,
                    solicitation: keySolicitation,
                    respondAfter:
                        Date.now() + this.getRespondDelayMSForKeySolicitation(streamId, fromUserId),
                } satisfies KeySolicitationItem)
            }
        }
        streamQueue.keySolicitationsNeedsSort = true
        this.checkStartTicking()
    }

    public enqueueKeySolicitation(
        streamId: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        keySolicitation: KeySolicitationContent,
    ): void {
        if (keySolicitation.deviceKey === this.userDevice.deviceKey) {
            //this.log.debug('ignoring key solicitation for our own device')
            return
        }
        const streamQueue = this.streamQueues.getQueue(streamId)
        const selectedQueue =
            fromUserId === this.userId
                ? this.mainQueues.ownKeySolicitations
                : streamQueue.keySolicitations

        const index = selectedQueue.findIndex(
            (x) =>
                x.streamId === streamId && x.solicitation.deviceKey === keySolicitation.deviceKey,
        )
        if (index > -1) {
            selectedQueue.splice(index, 1)
        }
        if (keySolicitation.sessionIds.length > 0 || keySolicitation.isNewDevice) {
            //this.log.debug('new key solicitation', { fromUserId, streamId, keySolicitation })
            streamQueue.keySolicitationsNeedsSort = true
            selectedQueue.push({
                streamId,
                fromUserId,
                fromUserAddress,
                solicitation: keySolicitation,
                respondAfter:
                    Date.now() + this.getRespondDelayMSForKeySolicitation(streamId, fromUserId),
            } satisfies KeySolicitationItem)
            this.checkStartTicking()
        } else if (index > -1) {
            //this.log.debug('cleared key solicitation', keySolicitation)
        }
    }

    public setStreamUpToDate(streamId: string): void {
        //this.log.debug('streamUpToDate', streamId)
        this.upToDateStreams.add(streamId)
        this.checkStartTicking()
    }

    public retryDecryptionFailures(streamId: string): void {
        const streamQueue = this.streamQueues.getQueue(streamId)
        if (
            this.decryptionFailures[streamId] &&
            Object.keys(this.decryptionFailures[streamId]).length > 0
        ) {
            this.log.debug(
                'membership change, re-enqueuing decryption failures for stream',
                streamId,
            )
            streamQueue.isMissingKeys = true
            this.checkStartTicking()
        }
    }

    public start(): void {
        check(!this.started, 'start() called twice, please re-instantiate instead')
        this.log.debug('starting')
        this.started = true
        // let the subclass override and do any custom startup tasks
        this.onStart()

        // enqueue a task to upload device keys
        this.mainQueues.priorityTasks.push(() => this.uploadDeviceKeys())
        // enqueue a task to download new to-device messages
        this.enqueueNewMessageDownload()
        // start the tick loop
        this.checkStartTicking()
    }

    // enqueue a task to download new to-device messages, should be safe to call multiple times
    public enqueueNewMessageDownload() {
        this.mainQueues.priorityTasks.push(() => this.downloadNewMessages())
    }

    public onStart(): void {
        // let the subclass override and do any custom startup tasks
    }

    public async stop(): Promise<void> {
        this._onStopFn?.()
        this._onStopFn = undefined
        // let the subclass override and do any custom shutdown tasks
        await this.onStop()
        await this.stopTicking()
    }

    public onStop(): Promise<void> {
        // let the subclass override and do any custom shutdown tasks
        return Promise.resolve()
    }

    public get status(): DecryptionStatus {
        return this._status
    }

    private setStatus(status: DecryptionStatus) {
        if (this._status !== status) {
            this.log.info(`status changed ${status}`)
            this._status = status
            this.emitter.emit('decryptionExtStatusChanged', status)
        }
    }

    private lastPrintedAt = 0
    protected checkStartTicking() {
        if (
            !this.started ||
            this.timeoutId ||
            !this._onStopFn ||
            !this.isUserInboxStreamUpToDate(this.upToDateStreams) ||
            this.shouldPauseTicking()
        ) {
            return
        }

        if (
            !Object.values(this.mainQueues).find((q) => q.length > 0) &&
            this.streamQueues.isEmpty()
        ) {
            this.setStatus(DecryptionStatus.done)
            return
        }

        if (Date.now() - this.lastPrintedAt > 30000) {
            this.log.info(
                `queues: ${Object.entries(this.mainQueues)
                    .map(([key, q]) => `${key}: ${q.length}`)
                    .join(', ')} ${this.streamQueues.toString()}`,
            )
            this.log.info(
                `priorityTasks: ${Array.from(this.streamQueues.streams.entries())
                    .filter(([_, value]) => !value.isEmpty())
                    .map(([key, _]) => key)
                    .sort(
                        (a, b) =>
                            this.getPriorityForStream(a, this.highPriorityIds) -
                            this.getPriorityForStream(b, this.highPriorityIds),
                    )
                    .slice(0, 4)
                    .join(', ')}`,
            )
            this.lastPrintedAt = Date.now()
        }

        this.timeoutId = setTimeout(() => {
            this.inProgressTick = this.tick()
            this.inProgressTick
                .catch((e) => this.log.error('ProcessTick Error', e))
                .finally(() => {
                    this.timeoutId = undefined
                    setTimeout(() => this.checkStartTicking())
                })
        }, this.getDelayMs())
    }

    private async stopTicking() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = undefined
        }
        if (this.inProgressTick) {
            try {
                await this.inProgressTick
            } catch (e) {
                this.log.error('ProcessTick Error while stopping', e)
            } finally {
                this.inProgressTick = undefined
            }
        }
    }

    private getDelayMs() {
        if (this.mainQueues.newGroupSession.length > 0) {
            return 0
        } else {
            return this.delayMs
        }
    }

    // just do one thing then return
    private tick(): Promise<void> {
        const now = Date.now()

        const priorityTask = this.mainQueues.priorityTasks.shift()
        if (priorityTask) {
            this.setStatus(DecryptionStatus.updating)
            return priorityTask()
        }

        // update any new group sessions
        const session = this.mainQueues.newGroupSession.shift()
        if (session) {
            this.setStatus(DecryptionStatus.working)
            return this.processNewGroupSession(session)
        }
        const ownSolicitation = this.mainQueues.ownKeySolicitations.shift()
        if (ownSolicitation) {
            this.log.debug(' processing own key solicitation')
            this.setStatus(DecryptionStatus.working)
            return this.processKeySolicitation(ownSolicitation)
        }
        const streamIds = this.streamQueues.getStreamIds()
        streamIds.sort(
            (a, b) =>
                this.getPriorityForStream(a, this.highPriorityIds) -
                this.getPriorityForStream(b, this.highPriorityIds),
        )

        for (const streamId of streamIds) {
            if (!this.upToDateStreams.has(streamId)) {
                continue
            }
            const streamQueue = this.streamQueues.getQueue(streamId)
            const encryptedContent = streamQueue.encryptedContent.shift()
            if (encryptedContent) {
                this.setStatus(DecryptionStatus.working)
                return this.processEncryptedContentItem(encryptedContent)
            }
            if (streamQueue.isMissingKeys) {
                this.setStatus(DecryptionStatus.working)
                streamQueue.isMissingKeys = false
                return this.processMissingKeys(streamId)
            }

            if (streamQueue.keySolicitationsNeedsSort) {
                streamQueue.sortKeySolicitations()
            }
            const keySolicitation = dequeueUpToDate(
                streamQueue.keySolicitations,
                now,
                (x) => x.respondAfter,
                this.upToDateStreams,
            )
            if (keySolicitation) {
                this.setStatus(DecryptionStatus.working)
                return this.processKeySolicitation(keySolicitation)
            }
        }

        this.setStatus(DecryptionStatus.idle)
        return Promise.resolve()
    }

    /**
     * processNewGroupSession
     * process new group sessions that were sent to our to device stream inbox
     * re-enqueue any decryption failures with matching session id
     */
    private async processNewGroupSession(sessionItem: NewGroupSessionItem): Promise<void> {
        const { streamId, sessions: session } = sessionItem
        // check if this message is to our device
        const ciphertext = session.ciphertexts[this.userDevice.deviceKey]
        if (!ciphertext) {
            this.log.debug('skipping, no session for our device')
            return
        }
        this.log.debug('processNewGroupSession', session)
        // check if it contains any keys we need, default to GroupEncryption if the algorithm is not set
        const parsed = parseGroupEncryptionAlgorithmId(
            session.algorithm,
            GroupEncryptionAlgorithmId.GroupEncryption,
        )
        if (parsed.kind === 'unrecognized') {
            // todo dispatch event to update the error message
            this.log.error('skipping, invalid algorithm', session.algorithm)
            return
        }
        const algorithm: GroupEncryptionAlgorithmId = parsed.value

        const neededKeyIndexs = []
        for (let i = 0; i < session.sessionIds.length; i++) {
            const sessionId = session.sessionIds[i]
            const hasKeys = await this.crypto.hasSessionKey(streamId, sessionId, algorithm)
            if (!hasKeys) {
                neededKeyIndexs.push(i)
            }
        }
        if (!neededKeyIndexs.length) {
            this.log.debug('skipping, we have all the keys')
            return
        }
        // decrypt the message
        const cleartext = await this.crypto.decryptWithDeviceKey(ciphertext, session.senderKey)
        const sessionKeys = SessionKeys.fromJsonString(cleartext)
        check(sessionKeys.keys.length === session.sessionIds.length, 'bad sessionKeys')
        // make group sessions
        const sessions = neededKeyIndexs.map(
            (i) =>
                ({
                    streamId: streamId,
                    sessionId: session.sessionIds[i],
                    sessionKey: sessionKeys.keys[i],
                    algorithm: algorithm,
                } satisfies GroupEncryptionSession),
        )
        // import the sessions
        this.log.debug(
            'importing group sessions streamId:',
            streamId,
            'count: ',
            sessions.length,
            session.sessionIds,
        )
        try {
            await this.crypto.importSessionKeys(streamId, sessions)
            // re-enqueue any decryption failures with these ids
            const streamQueue = this.streamQueues.getQueue(streamId)
            for (const session of sessions) {
                if (this.decryptionFailures[streamId]?.[session.sessionId]) {
                    streamQueue.encryptedContent.push(
                        ...this.decryptionFailures[streamId][session.sessionId],
                    )
                    delete this.decryptionFailures[streamId][session.sessionId]
                }
            }
        } catch (e) {
            // don't re-enqueue to prevent infinite loops if this session is truely corrupted
            // we will keep requesting it on each boot until it goes out of the scroll window
            this.log.error('failed to import sessions', { sessionItem, error: e })
        }
        // if we processed them all, ack the stream
        if (this.mainQueues.newGroupSession.length === 0) {
            await this.ackNewGroupSession(session)
        }
    }

    /**
     * processEncryptedContentItem
     * try to decrypt encrytped content
     */
    private async processEncryptedContentItem(item: EncryptedContentItem): Promise<void> {
        this.log.debug('processEncryptedContentItem', item)
        try {
            await this.decryptGroupEvent(item.streamId, item.eventId, item.kind, item.encryptedData)
        } catch (err) {
            const sessionNotFound = isSessionNotFoundError(err)

            this.onDecryptionError(item, {
                missingSession: sessionNotFound,
                kind: item.kind,
                encryptedData: item.encryptedData,
                error: err,
            })
            if (sessionNotFound) {
                const streamId = item.streamId
                const sessionId =
                    item.encryptedData.sessionId && item.encryptedData.sessionId.length > 0
                        ? item.encryptedData.sessionId
                        : bin_toHexString(item.encryptedData.sessionIdBytes)
                if (!this.decryptionFailures[streamId]) {
                    this.decryptionFailures[streamId] = { [sessionId]: [item] }
                } else if (!this.decryptionFailures[streamId][sessionId]) {
                    this.decryptionFailures[streamId][sessionId] = [item]
                } else if (!this.decryptionFailures[streamId][sessionId].includes(item)) {
                    this.decryptionFailures[streamId][sessionId].push(item)
                }

                const streamQueue = this.streamQueues.getQueue(streamId)
                streamQueue.isMissingKeys = true
            } else {
                this.log.info('failed to decrypt', err, 'streamId', item.streamId)
            }
        }
    }

    /**
     * processMissingKeys
     * process missing keys and send key solicitations to streams
     */
    private async processMissingKeys(streamId: string): Promise<void> {
        this.log.debug('processing missing keys', streamId)
        const missingSessionIds = takeFirst(
            100,
            Object.keys(this.decryptionFailures[streamId] ?? {}).sort(),
        )
        // limit to 100 keys for now todo revisit https://linear.app/hnt-labs/issue/HNT-3936/revisit-how-we-limit-the-number-of-session-ids-that-we-request
        if (!missingSessionIds.length) {
            this.log.debug('processing missing keys', streamId, 'no missing keys')
            return
        }
        if (!this.hasStream(streamId)) {
            this.log.debug('processing missing keys', streamId, 'stream not found')
            return
        }
        const isEntitled = await this.isUserEntitledToKeyExchange(streamId, this.userId, {
            skipOnChainValidation: true,
        })
        if (!isEntitled) {
            this.log.debug('processing missing keys', streamId, 'user is not member of stream')
            return
        }
        const solicitedEvents = this.getKeySolicitations(streamId)
        const existingKeyRequest = solicitedEvents.find(
            (x) => x.deviceKey === this.userDevice.deviceKey,
        )
        if (
            existingKeyRequest?.isNewDevice ||
            sortedArraysEqual(existingKeyRequest?.sessionIds ?? [], missingSessionIds)
        ) {
            this.log.debug(
                'processing missing keys already requested keys for this session',
                existingKeyRequest,
            )
            return
        }
        const knownSessionIds = await this.crypto.getGroupSessionIds(streamId)

        const isNewDevice = knownSessionIds.length === 0

        this.log.debug(
            'requesting keys',
            streamId,
            'isNewDevice',
            isNewDevice,
            'sessionIds:',
            missingSessionIds.length,
        )
        await this.sendKeySolicitation({
            streamId,
            isNewDevice,
            missingSessionIds,
        })
    }

    /**
     * processKeySolicitation
     * process incoming key solicitations and send keys and key fulfillments
     */
    private async processKeySolicitation(item: KeySolicitationItem): Promise<void> {
        this.log.debug('processing key solicitation', item.streamId, item)
        const streamId = item.streamId

        check(this.hasStream(streamId), 'stream not found')
        const knownSessionIds = await this.crypto.getGroupSessionIds(streamId)

        const { isValid, reason } = this.isValidEvent(streamId, item.solicitation.srcEventId)
        if (!isValid) {
            this.log.error('processing key solicitation: invalid event id', {
                streamId,
                eventId: item.solicitation.srcEventId,
                reason,
            })
            return
        }

        // todo split this up by algorithm so that we can send all the new hybrid keys
        knownSessionIds.sort()
        const requestedSessionIds = new Set(item.solicitation.sessionIds.sort())
        const replySessionIds = item.solicitation.isNewDevice
            ? knownSessionIds
            : knownSessionIds.filter((x) => requestedSessionIds.has(x))
        if (replySessionIds.length === 0) {
            this.log.debug('processing key solicitation: no keys to reply with')
            return
        }

        const isUserEntitledToKeyExchange = await this.isUserEntitledToKeyExchange(
            streamId,
            item.fromUserId,
        )
        if (!isUserEntitledToKeyExchange) {
            return
        }

        const allSessions: GroupEncryptionSession[] = []
        for (const sessionId of replySessionIds) {
            const groupSession = await this.crypto.exportGroupSession(streamId, sessionId)
            if (groupSession) {
                allSessions.push(groupSession)
            }
        }
        this.log.debug('processing key solicitation with', item.streamId, {
            to: item.fromUserId,
            toDevice: item.solicitation.deviceKey,
            requestedCount: item.solicitation.sessionIds.length,
            replyIds: replySessionIds.length,
            sessions: allSessions.length,
        })
        if (allSessions.length === 0) {
            return
        }
        // send a single key fulfillment for all algorithms
        const { error } = await this.sendKeyFulfillment({
            streamId,
            userAddress: item.fromUserAddress,
            deviceKey: item.solicitation.deviceKey,
            sessionIds: item.solicitation.isNewDevice
                ? []
                : allSessions.map((x) => x.sessionId).sort(),
        })

        // if the key fulfillment failed, someone else already sent a key fulfillment
        if (error) {
            if (!error.msg.includes('DUPLICATE_EVENT')) {
                // duplicate events are expected, we can ignore them, others are not
                this.log.error('failed to send key fulfillment', error)
            }
            return
        }

        // if the key fulfillment succeeded, send one group session payload for each algorithm
        const sessions = allSessions.reduce((acc, session) => {
            if (!acc[session.algorithm]) {
                acc[session.algorithm] = []
            }
            acc[session.algorithm].push(session)
            return acc
        }, {} as Record<GroupEncryptionAlgorithmId, GroupEncryptionSession[]>)

        // send one key fulfillment for each algorithm
        for (const kv of Object.entries(sessions)) {
            const algorithm = kv[0] as GroupEncryptionAlgorithmId
            const sessions = kv[1]

            await this.encryptAndShareGroupSessions({
                streamId,
                item,
                sessions,
                algorithm,
            })
        }
    }

    /**
     * can be overridden to add a delay to the key solicitation response
     */
    public getRespondDelayMSForKeySolicitation(_streamId: string, _userId: string): number {
        return 0
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
    }
}

export function makeSessionKeys(sessions: GroupEncryptionSession[]): SessionKeys {
    const sessionKeys = sessions.map((s) => s.sessionKey)
    return new SessionKeys({
        keys: sessionKeys,
    })
}

/// Returns the first item from the array,
/// if dateFn is provided, returns the first item where dateFn(item) <= now
function dequeueUpToDate<T extends { streamId: string }>(
    items: T[],
    now: number,
    dateFn: (x: T) => number,
    upToDateStreams: Set<string>,
): T | undefined {
    if (items.length === 0) {
        return undefined
    }
    if (dateFn(items[0]) > now) {
        return undefined
    }
    const index = items.findIndex((x) => dateFn(x) <= now && upToDateStreams.has(x.streamId))
    if (index === -1) {
        return undefined
    }
    return items.splice(index, 1)[0]
}

function sortedArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}

function takeFirst<T>(count: number, array: T[]): T[] {
    const result: T[] = []
    for (let i = 0; i < count && i < array.length; i++) {
        result.push(array[i])
    }
    return result
}

function isSessionNotFoundError(err: unknown): boolean {
    if (err !== null && typeof err === 'object' && 'message' in err) {
        return (err.message as string).toLowerCase().includes('session not found')
    }
    return false
}

function generateLogId(userId: string, deviceKey: string): string {
    const shortId = shortenHexString(userId.startsWith('0x') ? userId.slice(2) : userId)
    const shortKey = shortenHexString(deviceKey)
    const logId = `${shortId}:${shortKey}`
    return logId
}
