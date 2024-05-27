import {
    BaseDecryptionExtensions,
    DecryptionSessionError,
    EncryptedContentItem,
    EntitlementsDelegate,
    GroupEncryptionCrypto,
    GroupSessionsData,
    KeyFulfilmentData,
    KeySolicitationContent,
    KeySolicitationData,
    UserDevice,
} from '@river-build/encryption'
import {
    AddEventResponse_Error,
    EncryptedData,
    UserInboxPayload_GroupEncryptionSessions,
} from '@river-build/proto'
import { make_MemberPayload_KeyFulfillment, make_MemberPayload_KeySolicitation } from './types'

import { Client } from './client'
import { EncryptedContent } from './encryptedContentTypes'
import { Permission } from '@river-build/web3'
import { check } from '@river-build/dlog'
import chunk from 'lodash/chunk'
import { isDefined } from './check'
import { isMobileSafari } from './utils'

export class ClientDecryptionExtensions extends BaseDecryptionExtensions {
    private isMobileSafariBackgrounded = false

    constructor(
        private readonly client: Client,
        crypto: GroupEncryptionCrypto,
        delegate: EntitlementsDelegate,
        userId: string,
        userDevice: UserDevice,
    ) {
        const upToDateStreams = new Set<string>()
        client.streams.getStreams().forEach((stream) => {
            if (stream.isUpToDate) {
                upToDateStreams.add(stream.streamId)
            }
        })

        super(client, crypto, delegate, userDevice, userId, upToDateStreams)

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
            fromUserId: string,
            fromUserAddress: Uint8Array,
            keySolicitation: KeySolicitationContent,
        ) => this.enqueueKeySolicitation(streamId, fromUserId, fromUserAddress, keySolicitation)

        client.on('streamUpToDate', onStreamUpToDate)
        client.on('newGroupSessions', onNewGroupSessions)
        client.on('newEncryptedContent', onNewEncryptedContent)
        client.on('newKeySolicitation', onKeySolicitation)
        client.on('updatedKeySolicitation', onKeySolicitation)
        client.on('streamNewUserJoined', onMembershipChange)

        this._onStopFn = () => {
            client.off('streamUpToDate', onStreamUpToDate)
            client.off('newGroupSessions', onNewGroupSessions)
            client.off('newEncryptedContent', onNewEncryptedContent)
            client.off('newKeySolicitation', onKeySolicitation)
            client.off('updatedKeySolicitation', onKeySolicitation)
            client.off('streamNewUserJoined', onMembershipChange)
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
    public getRespondDelayMSForKeySolicitation(streamId: string, userId: string): number {
        const multiplier = userId === this.userId ? 0.5 : 1
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        const numMembers = stream.view.getMembers().participants().size
        const maxWaitTimeSeconds = Math.max(5, Math.min(30, numMembers))
        const waitTime = maxWaitTimeSeconds * 1000 * Math.random() // this could be much better
        this.log.debug('getRespondDelayMSForKeySolicitation', { streamId, userId, waitTime })
        return waitTime * multiplier
    }

    public hasUnprocessedSession(item: EncryptedContentItem): boolean {
        check(isDefined(this.client.userInboxStreamId), 'userInboxStreamId not found')
        const inboxStream = this.client.stream(this.client.userInboxStreamId)
        check(isDefined(inboxStream), 'inboxStream not found')
        return inboxStream.view.userInboxContent.hasPendingSessionId(
            this.userDevice.deviceKey,
            item.encryptedData.sessionId,
        )
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

    public onDecryptionError(item: EncryptedContentItem, err: DecryptionSessionError): void {
        this.client.stream(item.streamId)?.view.updateDecryptedContentError(
            item.eventId,
            {
                missingSession: err.missingSession,
                kind: err.kind,
                encryptedData: item.encryptedData,
                error: err,
            },
            this.client,
        )
    }

    public async ackNewGroupSession(
        _session: UserInboxPayload_GroupEncryptionSessions,
    ): Promise<void> {
        return this.client.ackInboxStream()
    }

    public async encryptAndShareGroupSessions({
        streamId,
        item,
        sessions,
    }: GroupSessionsData): Promise<void> {
        const chunked = chunk(sessions, 100)
        for (const chunk of chunked) {
            await this.client.encryptAndShareGroupSessions(streamId, chunk, {
                [item.fromUserId]: [
                    {
                        deviceKey: item.solicitation.deviceKey,
                        fallbackKey: item.solicitation.fallbackKey,
                    },
                ],
            })
        }
    }

    public async sendKeySolicitation({
        streamId,
        isNewDevice,
        missingSessionIds,
    }: KeySolicitationData): Promise<void> {
        const keySolicitation = make_MemberPayload_KeySolicitation({
            deviceKey: this.userDevice.deviceKey,
            fallbackKey: this.userDevice.fallbackKey,
            isNewDevice,
            sessionIds: isNewDevice ? [] : missingSessionIds,
        })
        await this.client.makeEventAndAddToStream(streamId, keySolicitation)
    }

    public async sendKeyFulfillment({
        streamId,
        userAddress,
        deviceKey,
        sessionIds,
    }: KeyFulfilmentData): Promise<{ error?: AddEventResponse_Error }> {
        const fulfillment = make_MemberPayload_KeyFulfillment({
            userAddress: userAddress,
            deviceKey: deviceKey,
            sessionIds: sessionIds,
        })

        const { error } = await this.client.makeEventAndAddToStream(streamId, fulfillment, {
            optional: true,
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
}
