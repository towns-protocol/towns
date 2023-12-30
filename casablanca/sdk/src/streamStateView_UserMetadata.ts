import { WrappedEncryptedData as WrappedEncryptedData, EncryptedData } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamEvents } from './streamEvents'
import { UserMetadata_Usernames } from './userMetadata_Usernames'
import { UserMetadata_DisplayNames } from './userMetadata_DisplayNames'
import { bin_toHexString } from '@river/mecholm'

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

    initialize(
        usernames: { [userId: string]: WrappedEncryptedData },
        displayNames: { [userId: string]: WrappedEncryptedData },
        emitter: TypedEmitter<EmittedEvents> | undefined,
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
            this.usernames.addEncryptedData(eventId, data, userId, false, undefined, emitter)
        }

        const sortedDisplayNames = sortPayloads(displayNames)
        for (const payload of sortedDisplayNames) {
            if (!payload.wrappedEncryptedData.data) {
                continue
            }
            const data = payload.wrappedEncryptedData.data
            const userId = payload.userId
            const eventId = bin_toHexString(payload.wrappedEncryptedData.eventHash)
            this.displayNames.addEncryptedData(eventId, data, userId, false, undefined, emitter)
        }
    }

    onConfirmedEvent(
        confirmedEvent: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const eventId = confirmedEvent.hashStr
        this.usernames.onConfirmEvent(eventId, emitter)
        this.displayNames.onConfirmEvent(eventId, emitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // usernames were conveyed in the snapshot
    }

    appendEncryptedData(
        eventId: string,
        data: EncryptedData,
        kind: 'displayName' | 'username',
        userId: string,
        cleartext: string | undefined,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        if (kind === 'displayName') {
            this.displayNames.addEncryptedData(eventId, data, userId, true, cleartext, emitter)
        } else if (kind === 'username') {
            this.usernames.addEncryptedData(eventId, data, userId, true, cleartext, emitter)
        }
    }

    onDecryptedContent(eventId: string, content: string, emitter?: TypedEmitter<EmittedEvents>) {
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
