import { GroupEncryptionCrypto, UserDevice } from '@towns-protocol/encryption'
import {
    BaseDecryptionExtensions,
    DecryptionSessionError,
    EncryptedContentItem,
    EntitlementsDelegate,
    EventSignatureBundle,
    GroupSessionsData,
    KeyFulfilmentData,
    KeySolicitationContent,
    KeySolicitationData,
    KeySolicitationItem,
} from './decryptionExtensions'

import {
    AddEventResponse_Error,
    EncryptedData,
    UserInboxPayload_GroupEncryptionSessions,
} from '@towns-protocol/proto'
import { make_MemberPayload_KeyFulfillment, make_MemberPayload_KeySolicitation } from './types'

import { Client } from './client'
import { EncryptedContent } from './encryptedContentTypes'
import { Permission } from '@towns-protocol/web3'
import { check } from '@towns-protocol/dlog'
import { chunk } from 'lodash-es'
import { isDefined } from './check'
import { isMobileSafari } from './utils'
import {
    spaceIdFromChannelId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isUserDeviceStreamId,
    isUserInboxStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isChannelStreamId,
} from './id'
import { checkEventSignature } from './sign'

export class ClientDecryptionExtensions extends BaseDecryptionExtensions {
    private isMobileSafariBackgrounded = false
    private validatedEvents: Record<string, { isValid: boolean; reason?: string }> = {}
    private unpackEnvelopeOpts?: { disableSignatureValidation?: boolean }

    constructor(
        private readonly client: Client,
        crypto: GroupEncryptionCrypto,
        delegate: EntitlementsDelegate,
        userId: string,
        userDevice: UserDevice,
        unpackEnvelopeOpts: { disableSignatureValidation?: boolean } | undefined,
        logId: string,
    ) {
        const upToDateStreams = new Set<string>()
        client.streams.getStreams().forEach((stream) => {
            if (stream.isUpToDate) {
                upToDateStreams.add(stream.streamId)
            }
        })

        super(client, crypto, delegate, userDevice, userId, upToDateStreams, logId)

        this.unpackEnvelopeOpts = unpackEnvelopeOpts
        const onMembershipChange = (streamId: string, userId: string) => {
            if (userId === this.userId) {
                this.retryDecryptionFailures(streamId)
            }
        }

        const onStreamUpToDate = (streamId: string) => this.setStreamUpToDate(streamId)

        const onNewGroupSessions = (
            sessions: UserInboxPayload_GroupEncryptionSessions,
            senderId: string,
        ) => this.enqueueNewGroupSessions(sessions, senderId)

        const onNewEncryptedContent = (
            streamId: string,
            eventId: string,
            content: EncryptedContent,
        ) => this.enqueueNewEncryptedContent(streamId, eventId, content.kind, content.content)

        const onKeySolicitation = (
            streamId: string,
            eventHashStr: string,
            fromUserId: string,
            fromUserAddress: Uint8Array,
            keySolicitation: KeySolicitationContent,
            sigBundle: EventSignatureBundle,
            ephemeral?: boolean,
        ) =>
            this.enqueueKeySolicitation(
                streamId,
                eventHashStr,
                fromUserId,
                fromUserAddress,
                keySolicitation,
                sigBundle,
                ephemeral,
            )

        const onInitKeySolicitations = (
            streamId: string,
            eventHashStr: string,
            members: {
                userId: string
                userAddress: Uint8Array
                solicitations: KeySolicitationContent[]
            }[],
            sigBundle: EventSignatureBundle,
        ) => this.enqueueInitKeySolicitations(streamId, eventHashStr, members, sigBundle)

        const onStreamInitialized = (streamId: string) => {
            if (isUserInboxStreamId(streamId)) {
                this.enqueueNewMessageDownload()
            }
        }

        const onStreamSyncActive = (active: boolean) => {
            this.log.info('onStreamSyncActive', active)
            if (!active) {
                this.resetUpToDateStreams()
            }
        }

        const onEphemeralKeyFulfillment = (event: KeyFulfilmentData) => {
            this.processEphemeralKeyFulfillment(event)
        }

        client.on('streamUpToDate', onStreamUpToDate)
        client.on('newGroupSessions', onNewGroupSessions)
        client.on('newEncryptedContent', onNewEncryptedContent)
        client.on('newKeySolicitation', onKeySolicitation)
        client.on('updatedKeySolicitation', onKeySolicitation)
        client.on('initKeySolicitations', onInitKeySolicitations)
        client.on('streamNewUserJoined', onMembershipChange)
        client.on('streamInitialized', onStreamInitialized)
        client.on('streamSyncActive', onStreamSyncActive)
        client.on('ephemeralKeyFulfillment', onEphemeralKeyFulfillment)

        this._onStopFn = () => {
            client.off('streamUpToDate', onStreamUpToDate)
            client.off('newGroupSessions', onNewGroupSessions)
            client.off('newEncryptedContent', onNewEncryptedContent)
            client.off('newKeySolicitation', onKeySolicitation)
            client.off('updatedKeySolicitation', onKeySolicitation)
            client.off('initKeySolicitations', onInitKeySolicitations)
            client.off('streamNewUserJoined', onMembershipChange)
            client.off('streamInitialized', onStreamInitialized)
            client.off('streamSyncActive', onStreamSyncActive)
            client.off('ephemeralKeyFulfillment', onEphemeralKeyFulfillment)
        }
        this.log.debug('new ClientDecryptionExtensions', { userDevice })
    }

    public hasStream(streamId: string): boolean {
        const stream = this.client.stream(streamId)
        return isDefined(stream)
    }

    public isUserInboxStreamUpToDate(upToDateStreams: Set<string>): boolean {
        return (
            this.client.userInboxStreamId !== undefined &&
            upToDateStreams.has(this.client.userInboxStreamId)
        )
    }

    public shouldPauseTicking(): boolean {
        return this.isMobileSafariBackgrounded
    }

    public async decryptGroupEvent(
        streamId: string,
        eventId: string,
        kind: string, // kind of data
        encryptedData: EncryptedData,
    ): Promise<void> {
        return this.client.decryptGroupEvent(streamId, eventId, kind, encryptedData)
    }

    public downloadNewMessages(): Promise<void> {
        this.log.info('downloadNewInboxMessages')
        return this.client.downloadNewInboxMessages()
    }

    public getKeySolicitations(streamId: string): KeySolicitationContent[] {
        const stream = this.client.stream(streamId)
        return stream?.view.getMembers().joined.get(this.userId)?.solicitations ?? []
    }

    /**
     * Override the default implementation to use the number of members in the stream
     * to determine the delay time.
     */
    public getRespondDelayMSForKeySolicitation(
        streamId: string,
        userId: string,
        opts: { ephemeral: boolean },
    ): number {
        const multiplier = userId === this.userId ? 0.5 : 1
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        const numMembers = stream.view.getMembers().joinedParticipants().size
        const maxWaitTimeSeconds = Math.max(5, Math.min(30, numMembers))
        const waitTime = maxWaitTimeSeconds * 1000 * Math.random() // this could be much better
        //this.log.debug('getRespondDelayMSForKeySolicitation', { streamId, userId, waitTime })
        const delay = waitTime * multiplier
        if (opts.ephemeral) {
            if (userId === this.userId) {
                return 0
            }
            return delay / 2
        }
        return delay
    }

    public async isUserEntitledToKeyExchange(
        streamId: string,
        userId: string,
        opts?: { skipOnChainValidation: boolean },
    ): Promise<boolean> {
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        if (!stream.view.userIsEntitledToKeyExchange(userId)) {
            this.log.info(
                `user ${userId} is not a member of stream ${streamId} and cannot request keys`,
            )
            return false
        }
        if (
            stream.view.contentKind === 'channelContent' &&
            !(opts?.skipOnChainValidation === true)
        ) {
            const channel = stream.view.channelContent
            const entitlements = await this.entitlementDelegate.isEntitled(
                channel.spaceId,
                streamId,
                userId,
                Permission.Read,
            )
            if (!entitlements) {
                this.log.info('user is not entitled to key exchange')
                return false
            }
        }
        return true
    }

    public isValidEvent(item: KeySolicitationItem): { isValid: boolean; reason?: string } {
        if (this.unpackEnvelopeOpts?.disableSignatureValidation !== true) {
            return { isValid: true }
        }
        const eventId = item.hashStr
        const sigBundle = item.sigBundle
        if (!sigBundle) {
            return { isValid: false, reason: 'event not found' }
        }
        if (!sigBundle.signature) {
            return { isValid: false, reason: 'remote event signature not found' }
        }
        if (this.validatedEvents[eventId]) {
            return this.validatedEvents[eventId]
        }
        try {
            checkEventSignature(sigBundle.event, sigBundle.hash, sigBundle.signature)
            const result = { isValid: true }
            this.validatedEvents[eventId] = result
            return result
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            const result = { isValid: false, reason: `error: ${err}` }
            this.validatedEvents[eventId] = result
            return result
        }
    }

    public onDecryptionError(item: EncryptedContentItem, err: DecryptionSessionError): void {
        this.client.stream(item.streamId)?.updateDecryptedContentError(item.eventId, {
            missingSession: err.missingSession,
            kind: err.kind,
            encryptedData: item.encryptedData,
            error: err,
        })
    }

    public async ackNewGroupSession(
        _session: UserInboxPayload_GroupEncryptionSessions,
    ): Promise<void> {
        await this.client.ackInboxStream()
        await this.client.setPendingUsernames()
    }

    public async encryptAndShareGroupSessions({
        streamId,
        item,
        sessions,
        algorithm,
    }: GroupSessionsData): Promise<void> {
        const chunked = chunk(sessions, 100)
        for (const chunk of chunked) {
            await this.client.encryptAndShareGroupSessions(
                streamId,
                chunk,
                {
                    [item.fromUserId]: [
                        {
                            deviceKey: item.solicitation.deviceKey,
                            fallbackKey: item.solicitation.fallbackKey,
                        },
                    ],
                },
                algorithm,
            )
        }
    }

    public async sendKeySolicitation({
        streamId,
        isNewDevice,
        missingSessionIds,
        ephemeral = false,
    }: KeySolicitationData & { ephemeral?: boolean }): Promise<void> {
        const keySolicitation = make_MemberPayload_KeySolicitation({
            deviceKey: this.userDevice.deviceKey,
            fallbackKey: this.userDevice.fallbackKey,
            isNewDevice,
            sessionIds: missingSessionIds,
        })

        if (ephemeral) {
            // Track own ephemeral solicitation with timer
            const item = {
                deviceKey: this.userDevice.deviceKey,
                fallbackKey: this.userDevice.fallbackKey,
                isNewDevice,
                missingSessionIds,
            }

            const timerId = setTimeout(() => {
                void this.convertEphemeralToNonEphemeral(streamId)
            }, this.ephemeralTimeoutMs)

            const existing = this.ownEphemeralSolicitations.get(streamId) || []
            existing.push({
                ...item,
                missingSessionIds: new Set(item.missingSessionIds),
                timerId,
                timestamp: Date.now(),
            })
            this.ownEphemeralSolicitations.set(streamId, existing)
        }

        await this.client.makeEventAndAddToStream(streamId, keySolicitation, { ephemeral })
    }

    public async sendKeyFulfillment({
        streamId,
        userAddress,
        deviceKey,
        sessionIds,
        ephemeral = false,
    }: KeyFulfilmentData & { ephemeral?: boolean }): Promise<{ error?: AddEventResponse_Error }> {
        const fulfillment = make_MemberPayload_KeyFulfillment({
            userAddress: userAddress,
            deviceKey: deviceKey,
            sessionIds: sessionIds,
        })

        const { error } = await this.client.makeEventAndAddToStream(streamId, fulfillment, {
            optional: true,
            ephemeral,
        })
        return { error }
    }

    public async uploadDeviceKeys(): Promise<void> {
        await this.client.uploadDeviceKeys()
    }

    public onStart(): void {
        if (isMobileSafari()) {
            document.addEventListener('visibilitychange', this.mobileSafariPageVisibilityChanged)
        }
    }

    public onStop(): Promise<void> {
        if (isMobileSafari()) {
            document.removeEventListener('visibilitychange', this.mobileSafariPageVisibilityChanged)
        }
        return Promise.resolve()
    }

    private mobileSafariPageVisibilityChanged = () => {
        this.log.debug('onMobileSafariBackgrounded', this.isMobileSafariBackgrounded)
        this.isMobileSafariBackgrounded = document.visibilityState === 'hidden'
        if (!this.isMobileSafariBackgrounded) {
            this.checkStartTicking()
        }
    }

    private async convertEphemeralToNonEphemeral(streamId: string): Promise<void> {
        const solicitations = this.ownEphemeralSolicitations.get(streamId)
        if (!solicitations || solicitations.length === 0) {
            return
        }

        // Clear all timers for this stream's ephemeral solicitations
        for (const solicitation of solicitations) {
            if (solicitation.timerId) {
                clearTimeout(solicitation.timerId)
            }
        }

        // Combine all missing session IDs from all ephemeral solicitations
        const allMissingSessionIds = new Set<string>()
        let isNewDevice = false

        for (const solicitation of solicitations) {
            solicitation.missingSessionIds.forEach((sessionId) => {
                allMissingSessionIds.add(sessionId)
            })
            if (solicitation.isNewDevice) {
                isNewDevice = true
            }
        }

        // Remove all ephemeral solicitations for this stream
        this.ownEphemeralSolicitations.delete(streamId)

        this.log.info('converting all ephemeral solicitations to non-ephemeral', streamId, {
            count: solicitations.length,
            totalSessionIds: allMissingSessionIds.size,
        })

        // Send combined non-ephemeral solicitation
        await this.sendKeySolicitation({
            streamId,
            isNewDevice,
            missingSessionIds: Array.from(allMissingSessionIds).sort(),
            ephemeral: false,
        })
    }

    public getPriorityForStream(
        streamId: string,
        highPriorityIds: Set<string>,
        recentStreamIds: Set<string>,
    ): number {
        if (
            isUserDeviceStreamId(streamId) ||
            isUserInboxStreamId(streamId) ||
            isUserStreamId(streamId) ||
            isUserSettingsStreamId(streamId)
        ) {
            return 0
        }
        // channel or dm we're currently viewing
        const isChannel = isChannelStreamId(streamId)
        const isDmOrGdm = isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)
        if ((isDmOrGdm || isChannel) && highPriorityIds.has(streamId)) {
            return 1
        }
        // space that we're currently viewing
        if (highPriorityIds.has(streamId)) {
            return 2
        }
        // if you're getting updates for this stream, decrypt them so that you see unread messages
        if (recentStreamIds.has(streamId)) {
            return 3
        }
        // channels in the space we're currently viewing
        if (isChannel) {
            const spaceId = spaceIdFromChannelId(streamId)
            if (highPriorityIds.has(spaceId)) {
                return 4
            }
        }
        // dms
        if (isDmOrGdm) {
            return 5
        }
        // then other channels,
        if (isChannel) {
            return 6
        }
        // then other spaces
        return 7
    }
}
