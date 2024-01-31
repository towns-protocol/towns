import { WrappedEncryptedData as WrappedEncryptedData, EncryptedData } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { UserMetadata_Usernames } from './userMetadata_Usernames'
import { UserMetadata_DisplayNames } from './userMetadata_DisplayNames'
import { bin_toHexString } from '@river/dlog'

export class StreamStateView_UserMetadata {
    readonly userId: string
    readonly streamId: string
    readonly usernames: UserMetadata_Usernames
    readonly displayNames: UserMetadata_DisplayNames

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
        this.usernames = new UserMetadata_Usernames(streamId)
        this.displayNames = new UserMetadata_DisplayNames(streamId)
    }

    applySnapshot(
        usernames: { [userId: string]: WrappedEncryptedData },
        displayNames: { [userId: string]: WrappedEncryptedData },
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        // Sort the payloads — this is necessary because we want to
        // make sure that whoever claimed a username first gets it.
        const sortedUsernames = sortPayloads(usernames)
        for (const payload of sortedUsernames) {
            if (!payload.wrappedEncryptedData.data) {
                continue
            }
            const data = payload.wrappedEncryptedData.data
            const userId = payload.userId
            const eventId = bin_toHexString(payload.wrappedEncryptedData.eventHash)
            const clearText = cleartexts?.[eventId]
            this.usernames.addEncryptedData(
                eventId,
                data,
                userId,
                false,
                clearText,
                encryptionEmitter,
                undefined,
            )
        }

        const sortedDisplayNames = sortPayloads(displayNames)
        for (const payload of sortedDisplayNames) {
            if (!payload.wrappedEncryptedData.data) {
                continue
            }
            const data = payload.wrappedEncryptedData.data
            const userId = payload.userId
            const eventId = bin_toHexString(payload.wrappedEncryptedData.eventHash)
            const clearText = cleartexts?.[eventId]
            this.displayNames.addEncryptedData(
                eventId,
                data,
                userId,
                false,
                clearText,
                encryptionEmitter,
                undefined,
            )
        }
    }

    onConfirmedEvent(
        confirmedEvent: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        const eventId = confirmedEvent.hashStr
        this.usernames.onConfirmEvent(eventId, stateEmitter)
        this.displayNames.onConfirmEvent(eventId, stateEmitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // usernames were conveyed in the snapshot
    }

    appendEncryptedData(
        eventId: string,
        data: EncryptedData,
        kind: 'displayName' | 'username',
        userId: string,
        cleartext: string | undefined,

        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        if (kind === 'displayName') {
            this.displayNames.addEncryptedData(
                eventId,
                data,
                userId,
                true,
                cleartext,
                encryptionEmitter,
                stateEmitter,
            )
        } else if (kind === 'username') {
            this.usernames.addEncryptedData(
                eventId,
                data,
                userId,
                true,
                cleartext,
                encryptionEmitter,
                stateEmitter,
            )
        }
    }

    onDecryptedContent(
        eventId: string,
        content: string,
        emitter?: TypedEmitter<StreamStateEvents>,
    ) {
        this.displayNames.onDecryptedContent(eventId, content, emitter)
        this.usernames.onDecryptedContent(eventId, content, emitter)
    }

    userInfo(userId: string): {
        username: string
        usernameConfirmed: boolean
        usernameEncrypted: boolean
        displayName: string
        displayNameEncrypted: boolean
    } {
        const usernameInfo = this.usernames.info(userId)
        const displayNameInfo = this.displayNames.info(userId)
        return {
            ...usernameInfo,
            ...displayNameInfo,
        }
    }
}

function sortPayloads(object: {
    [userId: string]: WrappedEncryptedData
}): { userId: string; wrappedEncryptedData: WrappedEncryptedData }[] {
    return Object.entries(object)
        .map(([userId, wrappedEncryptedData]) => {
            return {
                userId,
                wrappedEncryptedData,
            }
        })
        .sort((a, b) => {
            if (a.wrappedEncryptedData.eventNum > b.wrappedEncryptedData.eventNum) {
                return 1
            } else if (a.wrappedEncryptedData.eventNum < b.wrappedEncryptedData.eventNum) {
                return -1
            } else {
                return 0
            }
        })
}
