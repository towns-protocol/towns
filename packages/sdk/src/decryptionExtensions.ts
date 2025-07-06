import TypedEmitter from 'typed-emitter'
import { Permission } from '@towns-protocol/web3'
import {
    AddEventResponse_Error,
    EncryptedData,
    PlainMessage,
    SessionKeys,
    SessionKeysSchema,
    UserInboxPayload_GroupEncryptionSessions,
} from '@towns-protocol/proto'
import {
    shortenHexString,
    dlog,
    dlogError,
    DLogger,
    check,
    bin_toHexString,
} from '@towns-protocol/dlog'
import {
    GroupEncryptionAlgorithmId,
    GroupEncryptionSession,
    parseGroupEncryptionAlgorithmId,
    UserDevice,
    GroupEncryptionCrypto,
} from '@towns-protocol/encryption'
import { create, fromJsonString } from '@bufbuild/protobuf'
import { sortedArraysEqual } from './observable/utils'
import { isDefined } from './check'

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
}

// paired down from StreamEvent, required for signature validation
export interface EventSignatureBundle {
    hash: Uint8Array
    signature: Uint8Array | undefined
    event: {
        creatorAddress: Uint8Array
        delegateSig: Uint8Array
        delegateExpiryEpochMs: bigint
    }
}

export interface KeySolicitationItem {
    streamId: string
    fromUserId: string
    fromUserAddress: Uint8Array
    solicitation: KeySolicitationContent
    respondAfter: number // ms since epoch
    sigBundle: EventSignatureBundle
    hashStr: string
    ephemeral?: boolean
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
        const counts = Array.from(this.streams.entries()).reduce(
            (acc, [_, stream]) => {
                acc['encryptedContent'] =
                    (acc['encryptedContent'] ?? 0) + stream.encryptedContent.length
                acc['streamsMissingKeys'] =
                    (acc['streamsMissingKeys'] ?? 0) + (stream.isMissingKeys ? 1 : 0)
                acc['keySolicitations'] =
                    (acc['keySolicitations'] ?? 0) + stream.keySolicitations.length
                return acc
            },
            {} as Record<string, number>,
        )

        return Object.entries(counts)
            .map(([key, count]) => `${key}: ${count}`)
            .join(', ')
    }
}

class QueueRunner {
    timeoutId?: NodeJS.Timeout
    inProgress?: Promise<void>
    streamId?: string
    checkStartTicking?: () => void
    logError?: DLogger
    tag?: string
    constructor(public readonly kind: string) {}
    toString() {
        return `${this.kind}${this.tag ? ` ${this.tag}` : ''}${this.streamId ? ` ${this.streamId}` : ''}`
    }
    run(promise: Promise<void>, streamId?: string, tag?: string) {
        this.tag = tag
        this.inProgress = promise
        this.streamId = streamId
        this.inProgress
            .catch((e) => this.logError?.(`ProcessTick ${this.kind} Error`, e))
            .finally(() => {
                this.timeoutId = undefined
                this.inProgress = undefined
                this.streamId = undefined
                this.tag = undefined
                setTimeout(() => this.checkStartTicking?.())
            })
    }
    async stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = undefined
        }
        if (this.inProgress) {
            try {
                await this.inProgress
            } catch (e) {
                this.logError?.(`ProcessTick Error while stopping ${this.kind}`, e)
            } finally {
                this.inProgress = undefined
            }
        }
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
        ephemeralKeySolicitations: new Array<KeySolicitationItem>(),
    }
    private streamQueues = new StreamQueues()
    private mainQueueRunners = {
        priority: new QueueRunner('priority'),
        newGroupSessions: new QueueRunner('newGroupSession'),
        ownKeySolicitations: new QueueRunner('ownKeySolicitations'),
        ephemeralKeySolicitations: new QueueRunner('ephemeralKeySolicitations'),
    }
    private streamQueueRunners = [
        new QueueRunner('stream1'),
        new QueueRunner('stream2'),
        new QueueRunner('stream3'),
    ]
    private allQueueRunners = [...Object.values(this.mainQueueRunners), ...this.streamQueueRunners]
    private upToDateStreams = new Set<string>()
    private highPriorityIds: Set<string> = new Set()
    private recentStreamIds: string[] = []
    private decryptionFailures: Record<string, Record<string, EncryptedContentItem[]>> = {} // streamId: sessionId: EncryptedContentItem[]
    protected ownEphemeralSolicitations = new Map<
        string,
        Array<{
            deviceKey: string
            fallbackKey: string
            isNewDevice: boolean
            missingSessionIds: Set<string>
            timerId?: NodeJS.Timeout
            timestamp: number
        }>
    >() // key: streamId, value: array of solicitations
    private started: boolean = false
    private numRecentStreamIds: number = 5
    private emitter: TypedEmitter<DecryptionEvents>
    private checkStartTimeoutId?: NodeJS.Timeout

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
    public ephemeralTimeoutMs: number = 30000 // Default 30 seconds

    public constructor(
        emitter: TypedEmitter<DecryptionEvents>,
        crypto: GroupEncryptionCrypto,
        entitlementDelegate: EntitlementsDelegate,
        userDevice: UserDevice,
        userId: string,
        upToDateStreams: Set<string>,
        inLogId: string,
    ) {
        this.emitter = emitter
        this.crypto = crypto
        this.entitlementDelegate = entitlementDelegate
        this.userDevice = userDevice
        this.userId = userId
        // initialize with a set of up-to-date streams
        // ready for processing
        this.upToDateStreams = upToDateStreams

        const shortKey = shortenHexString(userDevice.deviceKey)
        const logId = `${inLogId}:${shortKey}`
        this.log = {
            debug: dlog('csb:decryption:debug', { defaultEnabled: false }).extend(logId),
            info: dlog('csb:decryption', { defaultEnabled: true }).extend(logId),
            error: dlogError('csb:decryption:error').extend(logId),
        }
        this.log.debug('new DecryptionExtensions', { userDevice })

        // initialize the queue runners
        for (const queueRunner of this.allQueueRunners) {
            queueRunner.logError = this.log.error
            queueRunner.checkStartTicking = () => this.checkStartTicking()
        }
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
    public abstract isUserEntitledToKeyExchange(
        streamId: string,
        userId: string,
        opts?: { skipOnChainValidation: boolean },
    ): Promise<boolean>
    public abstract isValidEvent(item: KeySolicitationItem): { isValid: boolean; reason?: string }
    public abstract isUserInboxStreamUpToDate(upToDateStreams: Set<string>): boolean
    public abstract onDecryptionError(item: EncryptedContentItem, err: DecryptionSessionError): void
    public abstract sendKeySolicitation(
        args: KeySolicitationData & { ephemeral?: boolean },
    ): Promise<void>
    public abstract sendKeyFulfillment(
        args: KeyFulfilmentData & { ephemeral?: boolean },
    ): Promise<{ error?: AddEventResponse_Error }>
    public abstract encryptAndShareGroupSessions(args: GroupSessionsData): Promise<void>
    public abstract shouldPauseTicking(): boolean
    /**
     * uploadDeviceKeys
     * upload device keys to the server
     */
    public abstract uploadDeviceKeys(): Promise<void>
    public abstract getPriorityForStream(
        streamId: string,
        highPriorityIds: Set<string>,
        recentStreamIds: Set<string>,
    ): number

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
        // dms, channels, gdms ("we're in the wrong package")
        if (streamId.startsWith('20') || streamId.startsWith('88') || streamId.startsWith('77')) {
            this.recentStreamIds.push(streamId)
            if (this.recentStreamIds.length > this.numRecentStreamIds) {
                this.recentStreamIds.shift()
            }
        }
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
        eventHashStr: string,
        members: {
            userId: string
            userAddress: Uint8Array
            solicitations: KeySolicitationContent[]
        }[],
        sigBundle: EventSignatureBundle,
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
                if (keySolicitation.sessionIds.length === 0) {
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
                        Date.now() +
                        this.getRespondDelayMSForKeySolicitation(streamId, fromUserId, {
                            ephemeral: false,
                        }),
                    sigBundle,
                    hashStr: eventHashStr,
                } satisfies KeySolicitationItem)
            }
        }
        streamQueue.keySolicitationsNeedsSort = true
        this.checkStartTicking()
    }

    public enqueueKeySolicitation(
        streamId: string,
        eventHashStr: string,
        fromUserId: string,
        fromUserAddress: Uint8Array,
        keySolicitation: KeySolicitationContent,
        sigBundle: EventSignatureBundle,
        ephemeral: boolean = false,
    ): void {
        if (keySolicitation.deviceKey === this.userDevice.deviceKey) {
            //this.log.debug('ignoring key solicitation for our own device')
            return
        }

        // Non-ephemeral solicitation handling (existing logic)
        const streamQueue = this.streamQueues.getQueue(streamId)
        const selectedQueue = ephemeral
            ? this.mainQueues.ephemeralKeySolicitations
            : fromUserId === this.userId
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
                    Date.now() +
                    this.getRespondDelayMSForKeySolicitation(streamId, fromUserId, { ephemeral }),
                sigBundle,
                hashStr: eventHashStr,
                ephemeral,
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

    public resetUpToDateStreams(): void {
        this.upToDateStreams.clear()
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
        // Clean up ephemeral solicitation timers
        for (const solicitations of this.ownEphemeralSolicitations.values()) {
            for (const solicitation of solicitations) {
                if (solicitation.timerId) {
                    clearTimeout(solicitation.timerId)
                }
            }
        }
        this.ownEphemeralSolicitations.clear()
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
            this.log.debug(`status changed ${status}`)
            this._status = status
            this.emitter.emit('decryptionExtStatusChanged', status)
        }
    }

    private compareStreamIds(a: string, b: string): number {
        const recentStreamIds = new Set(this.recentStreamIds)
        return (
            this.getPriorityForStream(a, this.highPriorityIds, recentStreamIds) -
            this.getPriorityForStream(b, this.highPriorityIds, recentStreamIds)
        )
    }

    private lastPrintedAt = 0
    protected checkStartTicking() {
        if (
            !this.started ||
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
            this.log.debug('no more work to do, setting status to done')
            this.setStatus(DecryptionStatus.done)
            return
        }

        const streamIds = this.streamQueues
            .getStreamIds()
            .filter((x) => !this.streamQueues.getQueue(x).isEmpty())
            .sort((a, b) => this.compareStreamIds(a, b))

        const logDebugInfo = Date.now() - this.lastPrintedAt > 30000
        if (logDebugInfo) {
            this.log.info(
                `status: ${this.status} queues: ${Object.entries(this.mainQueues)
                    .map(([key, q]) => `${key}: ${q.length}`)
                    .join(', ')} ${this.streamQueues.toString()}`,
            )
            const first4Priority = streamIds
                .filter((x) => this.upToDateStreams.has(x))
                .slice(0, 4)
                .join(', ')
            const first4Blocked = streamIds
                .filter((x) => !this.upToDateStreams.has(x))
                .slice(0, 4)
                .join(', ')
            if (first4Priority.length > 0 || first4Blocked.length > 0) {
                this.log.info(`priorityTasks: ${first4Priority} waitingFor: ${first4Blocked}`)
            }
            this.lastPrintedAt = Date.now()
        }

        this.tick(streamIds)

        if (logDebugInfo) {
            const runners = this.allQueueRunners.filter((x) => isDefined(x.inProgress))
            if (runners.length > 0) {
                this.log.info(`runners: ${runners.map((x) => x.toString()).join(', ')}`)
            }
        }

        // it's possible that we're not doing work, but we have more things to do but "respondAfter" hasn't been reached
        clearTimeout(this.checkStartTimeoutId)
        this.checkStartTimeoutId = setTimeout(() => {
            this.checkStartTicking()
        }, 100)
    }

    private async stopTicking() {
        clearTimeout(this.checkStartTimeoutId)
        for (const queueRunner of this.allQueueRunners) {
            await queueRunner.stop()
        }
    }

    // just do one thing then return
    private tick(streamIds: string[]) {
        const now = Date.now()

        // update the priority queue
        if (this.mainQueueRunners.priority.inProgress) {
            return // if the main queue is in progress, don't do anything else
        }

        const priorityTask = this.mainQueues.priorityTasks.shift()
        if (priorityTask) {
            this.setStatus(DecryptionStatus.updating)
            this.mainQueueRunners.priority.run(priorityTask())
            return // if the priority queue is in progress, don't do anything else
        }

        // update any new group sessions
        if (this.mainQueueRunners.newGroupSessions.inProgress) {
            return // if the new group sessions queue is in progress, don't do anything else
        }
        const session = this.mainQueues.newGroupSession.shift()
        if (session) {
            this.setStatus(DecryptionStatus.working)
            this.mainQueueRunners.newGroupSessions.run(this.processNewGroupSession(session))
            return // if the new group sessions queue is in progress, don't do anything else
        }

        // run the rest of the processes in parallel
        if (!this.mainQueueRunners.ownKeySolicitations.inProgress) {
            const ownSolicitation = this.mainQueues.ownKeySolicitations.shift()
            if (ownSolicitation) {
                this.log.debug(' processing own key solicitation')
                this.setStatus(DecryptionStatus.working)
                this.mainQueueRunners.ownKeySolicitations.run(
                    this.processKeySolicitation(ownSolicitation),
                )
            }
        }

        if (!this.mainQueueRunners.ephemeralKeySolicitations.inProgress) {
            if (this.mainQueues.ephemeralKeySolicitations.length > 0) {
                this.mainQueues.ephemeralKeySolicitations.sort(
                    (a, b) => a.respondAfter - b.respondAfter,
                )
                const ephemeralSolicitation = dequeueUpToDate(
                    this.mainQueues.ephemeralKeySolicitations,
                    now,
                    (x) => x.respondAfter,
                    this.upToDateStreams,
                )
                if (ephemeralSolicitation) {
                    this.log.debug(' processing ephemeral key solicitation')
                    this.setStatus(DecryptionStatus.working)
                    this.mainQueueRunners.ephemeralKeySolicitations.run(
                        this.processKeySolicitation(ephemeralSolicitation),
                    )
                }
            }
        }

        // grab open stream queues
        const openRunners = this.streamQueueRunners.filter((x) => !x.inProgress)
        const inProgressStreamIds = this.streamQueueRunners.map((x) => x.streamId).filter(isDefined)

        for (const streamId of streamIds) {
            if (openRunners.length === 0) {
                return // exit tick
            }
            if (inProgressStreamIds.includes(streamId)) {
                continue
            }

            const streamQueue = this.streamQueues.getQueue(streamId)
            const encryptedContent = streamQueue.encryptedContent.shift()
            if (encryptedContent) {
                this.setStatus(DecryptionStatus.working)
                const runner = openRunners.shift()!
                runner.run(
                    this.processEncryptedContentItem(encryptedContent),
                    streamId,
                    'decrypting',
                )
                continue
            }

            // if the stream is not up to date, don't move forward
            // it might be useful to post key solicitations, but without knowing the
            // state of the stream it's not a good idea
            if (!this.upToDateStreams.has(streamId)) {
                continue
            }

            if (streamQueue.isMissingKeys) {
                this.setStatus(DecryptionStatus.working)
                streamQueue.isMissingKeys = false
                const runner = openRunners.shift()!
                runner.run(this.processMissingKeys(streamId), streamId, 'missingKeys')
                continue
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
                const runner = openRunners.shift()!
                runner.run(
                    this.processKeySolicitation(keySolicitation),
                    streamId,
                    'keySolicitation',
                )
                continue
            }
        }

        if (this.allQueueRunners.every((x) => !x.inProgress)) {
            this.setStatus(DecryptionStatus.idle)
        }
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
        const sessionKeys = fromJsonString(SessionKeysSchema, cleartext)
        check(sessionKeys.keys.length === session.sessionIds.length, 'bad sessionKeys')
        // make group sessions
        const sessions = neededKeyIndexs.map(
            (i) =>
                ({
                    streamId: streamId,
                    sessionId: session.sessionIds[i],
                    sessionKey: sessionKeys.keys[i],
                    algorithm: algorithm,
                }) satisfies GroupEncryptionSession,
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
            this.log.debug('processEncryptedContentItem error', err, 'item:', item)
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
                if (sessionId.length === 0) {
                    this.log.error('session id length is 0 for failed decryption', {
                        err,
                        streamId: item.streamId,
                        eventId: item.eventId,
                    })
                    return
                }
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
                this.log.info(
                    'failed to decrypt',
                    err,
                    'eventId',
                    item.eventId,
                    'streamId',
                    item.streamId,
                )
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
            'requesting keys (ephemeral)',
            streamId,
            'isNewDevice',
            isNewDevice,
            'sessionIds:',
            missingSessionIds.length,
        )
        // Send ephemeral solicitation first
        await this.sendKeySolicitation({
            streamId,
            isNewDevice,
            missingSessionIds,
            ephemeral: true,
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

        const { isValid, reason } = this.isValidEvent(item)
        if (!isValid) {
            this.log.error('processing key solicitation: invalid event id', {
                streamId,
                eventId: item.hashStr,
                reason,
            })
            return
        }

        const knownSessionIds = await this.crypto.getGroupSessionIds(streamId)

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
            ephemeral: item.ephemeral,
        })
        if (allSessions.length === 0) {
            return
        }

        // send a single key fulfillment for all algorithms
        const { error } = await this.sendKeyFulfillment({
            streamId,
            userAddress: item.fromUserAddress,
            deviceKey: item.solicitation.deviceKey,
            sessionIds: allSessions
                .map((x) => x.sessionId)
                .filter((x) => requestedSessionIds.has(x))
                .sort(),
            ephemeral: item.ephemeral,
        })

        // if the key fulfillment failed, someone else already sent a key fulfillment
        if (error) {
            if (!error.msg.includes('DUPLICATE_EVENT') && !error.msg.includes('NOT_FOUND')) {
                // duplicate events are expected, we can ignore them, others are not
                this.log.error('failed to send key fulfillment', error)
            }
            return
        }

        // if the key fulfillment succeeded, send one group session payload for each algorithm
        const sessions = allSessions.reduce(
            (acc, session) => {
                if (!acc[session.algorithm]) {
                    acc[session.algorithm] = []
                }
                acc[session.algorithm].push(session)
                return acc
            },
            {} as Record<GroupEncryptionAlgorithmId, GroupEncryptionSession[]>,
        )

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

    processEphemeralKeyFulfillment(event: KeyFulfilmentData) {
        if (event.deviceKey === this.userDevice.deviceKey) {
            const solicitations = this.ownEphemeralSolicitations.get(event.streamId)
            if (solicitations) {
                // Process each solicitation and remove those that are fully fulfilled
                const remainingSolicitations = solicitations.filter((solicitation) => {
                    // Remove fulfilled session IDs from the set
                    event.sessionIds.forEach((id) => {
                        solicitation.missingSessionIds.delete(id)
                    })

                    if (solicitation.missingSessionIds.size === 0) {
                        // All sessions fulfilled, cancel timer
                        if (solicitation.timerId) {
                            clearTimeout(solicitation.timerId)
                        }
                        this.log.debug('ephemeral solicitation fully fulfilled', event.streamId)
                        return false // Remove this solicitation
                    } else {
                        // Still has remaining session IDs
                        this.log.debug(
                            'ephemeral solicitation partially fulfilled',
                            event.streamId,
                            'remaining:',
                            solicitation.missingSessionIds.size,
                        )
                        return true // Keep this solicitation
                    }
                })

                if (remainingSolicitations.length === 0) {
                    this.ownEphemeralSolicitations.delete(event.streamId)
                } else {
                    this.ownEphemeralSolicitations.set(event.streamId, remainingSolicitations)
                }
            }
        }

        // Cancel any pending ephemeral solicitations to prevent over-fulfilling
        const streamQueue = this.mainQueues

        // Remove solicitations that are completely fulfilled
        streamQueue.ephemeralKeySolicitations = streamQueue.ephemeralKeySolicitations.filter(
            (solicitation) => {
                if (solicitation.solicitation.deviceKey !== event.deviceKey) {
                    return true // not the same device, keep it
                }

                // Check if all requested sessions are fulfilled by this fulfillment
                const remainingSessionIds = solicitation.solicitation.sessionIds.filter(
                    (id) => !event.sessionIds.includes(id),
                )

                if (remainingSessionIds.length === 0) {
                    // All sessions fulfilled, remove this solicitation to prevent duplicate responses
                    this.log.debug(
                        'cancelling fully fulfilled ephemeral solicitation',
                        event.streamId,
                        solicitation.fromUserId,
                        'device:',
                        solicitation.solicitation.deviceKey,
                    )
                    return false
                } else {
                    // Update with remaining session IDs
                    solicitation.solicitation.sessionIds = remainingSessionIds
                    this.log.debug(
                        'partially fulfilled ephemeral solicitation',
                        event.streamId,
                        solicitation.fromUserId,
                        'remaining:',
                        remainingSessionIds.length,
                        'respondingIn',
                        Date.now() - solicitation.respondAfter,
                    )
                    return true
                }
            },
        )
    }

    /**
     * can be overridden to add a delay to the key solicitation response
     */
    public getRespondDelayMSForKeySolicitation(
        _streamId: string,
        _userId: string,
        _opts: { ephemeral: boolean },
    ): number {
        return 0
    }

    public setHighPriorityStreams(streamIds: string[]) {
        this.highPriorityIds = new Set(streamIds)
    }
}

export function makeSessionKeys(sessions: GroupEncryptionSession[]): SessionKeys {
    const sessionKeys = sessions.map((s) => s.sessionKey)
    return create(SessionKeysSchema, {
        keys: sessionKeys,
    } satisfies PlainMessage<SessionKeys>)
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
