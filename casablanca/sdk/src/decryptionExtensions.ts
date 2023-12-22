import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import chunk from 'lodash/chunk'
import { Permission } from '@river/web3'
import { Client } from './client'
import { EncryptedContent } from './encryptedContentTypes'
import { MEGOLM_ALGORITHM, MegolmSession, UserDevice } from './crypto/olmLib'
import { SessionKeys, UserToDevicePayload_MegolmSessions } from '@river/proto'
import { check, isDefined } from './check'
import { dlog, dlogError, DLogger } from './dlog'
import {
    KeySolicitationContent,
    make_CommonPayload_KeyFulfillment,
    make_CommonPayload_KeySolicitation,
} from './types'
import { shortenHexString } from './binary'

export interface EntitlementsDelegate {
    isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ): Promise<boolean>
}

export enum DecryptionStatus {
    initializing,
    updating,
    processingNewMegolmSessions,
    decryptingEvents,
    retryingDecryption,
    requestingKeys,
    respondingToKeyRequests,
    idle,
}

export type DecryptionEvents = {
    statusChanged: (status: DecryptionStatus) => void
}

interface EncryptedContentItem {
    streamId: string
    eventId: string
    encryptedContent: EncryptedContent
}

interface DecryptionRetryItem {
    event: EncryptedContentItem
    retryAt: Date
}

interface KeySolicitationItem {
    streamId: string
    fromUserId: string
    solicitation: KeySolicitationContent
    respondAfter: Date
}

interface MissingKeysItem {
    streamId: string
    waitUntil: Date
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
export class DecryptionExtensions extends (EventEmitter as new () => TypedEmitter<DecryptionEvents>) {
    public status: DecryptionStatus = DecryptionStatus.initializing
    private log: {
        debug: DLogger
        info: DLogger
        error: DLogger
    }
    private onStopFn?: () => void
    private queues = {
        priorityTasks: new Array<() => Promise<void>>(),
        newMegolmSession: new Array<UserToDevicePayload_MegolmSessions>(),
        encryptedContent: new Array<EncryptedContentItem>(),
        decryptionRetries: new Array<DecryptionRetryItem>(),
        missingKeys: new Array<MissingKeysItem>(),
        keySolicitations: new Array<KeySolicitationItem>(),
    }
    private decryptionFailures: Record<string, Record<string, EncryptedContentItem[]>> = {} // streamId: sessionId: EncryptedContentItem[]
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private delayMs: number = 15
    private started: boolean = false

    constructor(
        private client: Client,
        private delegate: EntitlementsDelegate,
        private userId: string,
        private userDevice: UserDevice,
    ) {
        super()
        const shortId = shortenHexString(
            this.userId.startsWith('0x') ? this.userId.slice(2) : this.userId,
        )
        const shortKey = shortenHexString(userDevice.deviceKey)
        const logId = `${shortId}:${shortKey}`
        this.log = {
            debug: dlog('csb:decryption:debug', { defaultEnabled: false }).extend(logId),
            info: dlog('csb:decryption', { defaultEnabled: true }).extend(logId),
            error: dlogError('csb:decryption:error').extend(logId),
        }

        this.log.debug('new DecryptionExtensions', { userDevice })
        const onNewMegolmSessions = (
            sessions: UserToDevicePayload_MegolmSessions,
            _senderId: string,
        ) => {
            this.queues.newMegolmSession.push(sessions)
            this.checkStartTicking()
        }

        const onNewEncryptedContent = (
            streamId: string,
            eventId: string,
            encryptedContent: EncryptedContent,
        ) => {
            this.queues.encryptedContent.push({
                streamId,
                eventId,
                encryptedContent,
            })
            this.checkStartTicking()
        }

        const onKeySolicitation = (
            streamId: string,
            fromUserId: string,
            keySolicitation: KeySolicitationContent,
        ) => {
            if (keySolicitation.deviceKey === this.userDevice.deviceKey) {
                this.log.debug('ignoring key solicitation for our own device')
                return
            }
            const index = this.queues.keySolicitations.findIndex(
                (x) =>
                    x.streamId === streamId &&
                    x.solicitation.deviceKey === keySolicitation.deviceKey,
            )
            if (index > -1) {
                this.queues.keySolicitations.splice(index, 1)
            }
            if (keySolicitation.sessionIds.length > 0 || keySolicitation.isNewDevice) {
                this.log.debug('new key solicitation', keySolicitation)
                this.queues.keySolicitations.push({
                    streamId,
                    fromUserId,
                    solicitation: keySolicitation,
                    respondAfter: new Date(
                        Date.now() + this.getRespondDelayMSForKeySolicitation(streamId, fromUserId),
                    ),
                })
                this.checkStartTicking()
            } else if (index > -1) {
                this.log.debug('cleared key solicitation', keySolicitation)
            }
        }

        client.on('newMegolmSessions', onNewMegolmSessions)
        client.on('newEncryptedContent', onNewEncryptedContent)
        client.on('newKeySolicitation', onKeySolicitation)
        client.on('updatedKeySolicitation', onKeySolicitation)

        this.onStopFn = () => {
            client.off('newMegolmSessions', onNewMegolmSessions)
            client.off('newEncryptedContent', onNewEncryptedContent)
            client.off('newKeySolicitation', onKeySolicitation)
            client.off('updatedKeySolicitation', onKeySolicitation)
        }
    }

    start() {
        check(!this.started, 'start() called twice, please re-instantiate instead')
        this.log.debug('starting')
        this.started = true
        // enqueue a task to download new to-device messages
        this.queues.priorityTasks.push(() => this.client.downloadNewToDeviceMessages())
        // start the tick loop
        this.checkStartTicking()
    }

    async stop() {
        this.onStopFn?.()
        this.onStopFn = undefined
        await this.stopTicking()
    }

    private setStatus(status: DecryptionStatus) {
        if (this.status !== status) {
            this.log.info(`status changed ${DecryptionStatus[status]}`)
            this.status = status
            this.emit('statusChanged', status)
        }
    }

    private checkStartTicking() {
        if (!this.started || this.timeoutId || !this.onStopFn) {
            return
        }
        if (!Object.values(this.queues).find((q) => q.length > 0)) {
            this.setStatus(DecryptionStatus.idle)
            return
        }
        this.timeoutId = setTimeout(() => {
            this.inProgressTick = this.tick()
            this.inProgressTick
                .catch((e) => this.log.error('ProcessTick Error', e))
                .finally(() => {
                    this.timeoutId = undefined
                    this.checkStartTicking()
                })
        }, this.delayMs)
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

    // just do one thing then return
    private tick(): Promise<void> {
        const now = new Date()

        const priorityTask = this.queues.priorityTasks.shift()
        if (priorityTask) {
            this.setStatus(DecryptionStatus.updating)
            return priorityTask()
        }

        const session = this.queues.newMegolmSession.shift()
        if (session) {
            this.setStatus(DecryptionStatus.processingNewMegolmSessions)
            return this.processNewMegolmSession(session)
        }

        const encryptedContent = this.queues.encryptedContent.shift()
        if (encryptedContent) {
            this.setStatus(DecryptionStatus.decryptingEvents)
            return this.processEncryptedContentItem(encryptedContent)
        }

        const decryptionRetry = dequeue(this.queues.decryptionRetries, now, (x) => x.retryAt)
        if (decryptionRetry) {
            this.setStatus(DecryptionStatus.retryingDecryption)
            return this.processDecryptionRetry(decryptionRetry)
        }

        const missingKeys = dequeue(this.queues.missingKeys, now, (x) => x.waitUntil)
        if (missingKeys) {
            this.setStatus(DecryptionStatus.requestingKeys)
            return this.processMissingKeys(missingKeys)
        }

        const keySolicitation = dequeue(this.queues.keySolicitations, now, (x) => x.respondAfter)
        if (keySolicitation) {
            this.setStatus(DecryptionStatus.respondingToKeyRequests)
            return this.processKeySolicitation(keySolicitation)
        }

        this.setStatus(DecryptionStatus.idle)
        return Promise.resolve()
    }

    /**
     * processNewMegolmSession
     * process new megolm sessions that were sent to our to device stream inbox
     * re-enqueue any decryption failures with matching session id
     */
    private async processNewMegolmSession(
        session: UserToDevicePayload_MegolmSessions,
    ): Promise<void> {
        this.log.debug('processNewMegolmSession', session)
        // check if this message is to our device
        const ciphertext = session.ciphertexts[this.userDevice.deviceKey]
        if (!ciphertext) {
            this.log.debug('skipping, no session for our device')
            return
        }
        // check if it contains any keys we need
        const neededKeyIndexs = []
        for (let i = 0; i < session.sessionIds.length; i++) {
            const sessionId = session.sessionIds[i]
            const hasKeys = await this.client.hasInboundSessionKeys(session.streamId, sessionId)
            if (!hasKeys) {
                neededKeyIndexs.push(i)
            }
        }
        if (!neededKeyIndexs.length) {
            this.log.debug('skipping, we have all the keys')
            return
        }
        // decrypt the message
        const cleartext = await this.client.decryptOlmEvent(ciphertext, session.senderKey)
        const sessionKeys = SessionKeys.fromJsonString(cleartext)
        check(sessionKeys.keys.length === session.sessionIds.length, 'bad sessionKeys')
        // make megolm sessions
        const sessions = neededKeyIndexs.map((i) => ({
            streamId: session.streamId,
            sessionId: session.sessionIds[i],
            sessionKey: sessionKeys.keys[i],
            algorithm: MEGOLM_ALGORITHM,
        }))
        // import the sessions
        this.log.info(
            'importing megolm sessions streamId:',
            session.streamId,
            'count: ',
            sessions.length,
        )
        await this.client.importRoomKeys(session.streamId, sessions)
        // re-enqueue any decryption failures with these ids
        for (const session of sessions) {
            if (this.decryptionFailures[session.streamId]?.[session.sessionId]) {
                this.queues.encryptedContent.push(
                    ...this.decryptionFailures[session.streamId][session.sessionId],
                )
                delete this.decryptionFailures[session.streamId][session.sessionId]
            }
        }
        // if we processed them all, ack the stream
        if (this.queues.newMegolmSession.length === 0) {
            await this.client.ackToDeviceStream()
        }
    }

    /**
     * processEncryptedContentItem
     * try to decrypt encrytped content
     */
    private async processEncryptedContentItem(item: EncryptedContentItem): Promise<void> {
        this.log.debug('processEncryptedContentItem', item)
        try {
            check(isDefined(this.client.userToDeviceStreamId), 'userToDeviceStreamId not found')
            const toDeviceStream = this.client.stream(this.client.userToDeviceStreamId)
            check(isDefined(toDeviceStream), 'toDeviceStream not found')
            if (
                toDeviceStream.view.userToDeviceContent.hasPendingSessionId(
                    this.userDevice.deviceKey,
                    item.encryptedContent.content.sessionId,
                )
            ) {
                this.log.debug('skipping, session is pending in to device stream')
                // if we have a pending session for this key, waiting for confirmation then we can't decrypt it yet
                this.queues.decryptionRetries.push({
                    event: item,
                    retryAt: new Date(Date.now() + 1000), // give it 1 seconds for miniblockblock to confirm
                })
            } else {
                // do the work to decrypt the event
                this.log.debug('decrypting content')
                await this.client.decryptMegolmEvent(
                    item.streamId,
                    item.eventId,
                    item.encryptedContent,
                )
            }
        } catch (err: unknown) {
            const sessionNotFound = isSessionNotFoundError(err)
            this.log.debug('failed to decrypt', err, 'sessionNotFound', sessionNotFound)

            this.client.stream(item.streamId)?.view.updateDecryptedContentError(
                item.eventId,
                {
                    missingSession: sessionNotFound,
                    encryptedContent: item.encryptedContent,
                    error: err,
                },
                this.client,
            )
            if (sessionNotFound) {
                this.queues.decryptionRetries.push({
                    event: item,
                    retryAt: new Date(Date.now() + 3000), // give it 3 seconds, maybe someone will send us the key
                })
            }
        }
    }

    /**
     * processDecryptionRetry
     * retry decryption a second time for a failed decryption, keys may have arrived
     */
    private async processDecryptionRetry(retryItem: DecryptionRetryItem): Promise<void> {
        const item = retryItem.event
        try {
            this.log.debug('retrying decryption', item)
            await this.client.decryptMegolmEvent(item.streamId, item.eventId, item.encryptedContent)
        } catch (err) {
            const sessionNotFound = isSessionNotFoundError(err)
            this.log.debug('failed to decrypt on retry', err, 'sessionNotFound', sessionNotFound)
            this.client.stream(item.streamId)?.view.updateDecryptedContentError(
                item.eventId,
                {
                    missingSession: sessionNotFound,
                    encryptedContent: item.encryptedContent,
                    error: err,
                },
                this.client,
            )
            if (sessionNotFound) {
                const streamId = item.streamId
                const sessionId = item.encryptedContent.content.sessionId
                if (!this.decryptionFailures[streamId]) {
                    this.decryptionFailures[streamId] = {}
                }
                if (!this.decryptionFailures[streamId][sessionId]) {
                    this.decryptionFailures[streamId][sessionId] = []
                }
                this.decryptionFailures[streamId][sessionId].push(item)

                removeItem(this.queues.missingKeys, (x) => x.streamId === streamId)
                this.queues.missingKeys.push({
                    streamId: item.streamId,
                    waitUntil: new Date(Date.now() + 1000),
                })
            }
        }
    }

    /**
     * processMissingKeys
     * process missing keys and send key solicitations to streams
     */
    private async processMissingKeys(item: MissingKeysItem): Promise<void> {
        this.log.debug('processing missing keys', item)
        const streamId = item.streamId
        const missingSessionIds = takeFirst(
            100,
            Object.keys(this.decryptionFailures[streamId] ?? {}).sort(),
        )
        // limit to 100 keys for now todo revisit https://linear.app/hnt-labs/issue/HNT-3936/revisit-how-we-limit-the-number-of-session-ids-that-we-request
        if (!missingSessionIds.length) {
            return
        }
        const stream = this.client.stream(streamId)
        if (!stream) {
            return
        }
        const solicitedEvents = stream.view.commonContent.solicitations[this.userId] ?? []
        const existingKeyRequest = solicitedEvents.find(
            (x) => x.deviceKey === this.userDevice.deviceKey,
        )
        if (
            existingKeyRequest?.isNewDevice ||
            sortedArraysEqual(existingKeyRequest?.sessionIds ?? [], missingSessionIds)
        ) {
            this.log.debug('already requested keys for this session')
            return
        }
        const knownSessionIds =
            (await this.client.cryptoBackend?.olmDevice?.getInboundGroupSessionIds(streamId)) ?? []

        const isNewDevice = knownSessionIds.length === 0

        const keySolicitation = make_CommonPayload_KeySolicitation({
            deviceKey: this.userDevice.deviceKey,
            fallbackKey: this.userDevice.fallbackKey,
            isNewDevice,
            sessionIds: isNewDevice ? [] : missingSessionIds,
        })
        this.log.info(
            'requesting keys',
            item.streamId,
            'isNewDevice',
            isNewDevice,
            'sessionIds:',
            missingSessionIds.length,
        )
        await this.client.makeEventAndAddToStream(streamId, keySolicitation)
    }

    /**
     * processKeySolicitation
     * process incoming key solicitations and send keys and key fulfilments
     */
    private async processKeySolicitation(item: KeySolicitationItem): Promise<void> {
        this.log.debug('processing key solicitation', item.streamId, item)
        const streamId = item.streamId
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        const knownSessionIds =
            (await this.client.cryptoBackend?.olmDevice.getInboundGroupSessionIds(streamId)) ?? []

        knownSessionIds.sort()
        const requestedSessionIds = new Set(item.solicitation.sessionIds.sort())
        const replySessionIds = item.solicitation.isNewDevice
            ? knownSessionIds
            : knownSessionIds.filter((x) => requestedSessionIds.has(x))
        if (replySessionIds.length === 0) {
            this.log.debug('processing key solicitation: no keys to reply with')
            return
        }

        if (!stream.view.userIsEntitledToKeyExchange(this.client.userId)) {
            this.log.info('user is not a member of the room and cannot request keys')
            return
        }
        if (stream.view.contentKind === 'channelContent') {
            const channel = stream.view.channelContent
            const entitlements = await this.delegate.isEntitled(
                channel.spaceId,
                streamId,
                item.fromUserId,
                Permission.Read,
            )
            if (!entitlements) {
                this.log.info('user is not entitled to key exchange')
                return
            }
        }
        const sessions: MegolmSession[] = []
        for (const sessionId of replySessionIds) {
            const megolmSession = await this.client.olmDevice.exportInboundGroupSession(
                streamId,
                sessionId,
            )
            if (megolmSession) {
                sessions.push(megolmSession)
            }
        }
        this.log.debug('processing key solicitation with', item.streamId, {
            to: item.fromUserId,
            toDevice: item.solicitation.deviceKey,
            requestedCount: item.solicitation.sessionIds.length,
            replyIds: replySessionIds.length,
            sessions: sessions.length,
        })
        if (sessions.length === 0) {
            return
        }

        const fulfillment = make_CommonPayload_KeyFulfillment({
            userId: item.fromUserId,
            deviceKey: item.solicitation.deviceKey,
            sessionIds: item.solicitation.isNewDevice ? [] : sessions.map((x) => x.sessionId),
        })

        await this.client.makeEventAndAddToStream(streamId, fulfillment)

        const chunked = chunk(sessions, 100)
        for (const chunk of chunked) {
            await this.client.encryptAndShareMegolmSessions(streamId, chunk, {
                [item.fromUserId]: [
                    {
                        deviceKey: item.solicitation.deviceKey,
                        fallbackKey: item.solicitation.fallbackKey,
                    },
                ],
            })
        }
    }

    private getRespondDelayMSForKeySolicitation(streamId: string, userId: string): number {
        // if its us requesting... then we can respond immediately
        if (userId === this.userId) {
            return 0
        }
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        const numMembers = stream.view.getMemberships().joinedUsers.size
        const maxWaitTimeSeconds = Math.max(5, Math.min(30, numMembers))
        const waitTime = maxWaitTimeSeconds * 1000 * Math.random() // this could be much better
        this.log.debug('getRespondDelayMSForKeySolicitation', { streamId, userId, waitTime })
        return waitTime
    }
}

/// Returns the first item from the array,
/// if dateFn is provided, returns the first item where dateFn(item) <= now
function dequeue<T>(items: T[], now: Date, dateFn: (x: T) => Date): T | undefined {
    if (items.length === 0) {
        return undefined
    }
    items.sort((a, b) => dateFn(a).getTime() - dateFn(b).getTime())
    if (dateFn(items[0]) > now) {
        return undefined
    }
    return items.shift()
}

function removeItem<T>(items: T[], predicate: (x: T) => boolean) {
    const index = items.findIndex(predicate)
    if (index !== -1) {
        items.splice(index, 1)
    }
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
        return (err.message as string).includes('Session not found')
    }
    return false
}
