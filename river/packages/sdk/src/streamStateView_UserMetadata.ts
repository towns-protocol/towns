import {
    WrappedEncryptedData as WrappedEncryptedData,
    EncryptedData,
    MemberPayload_Nft,
} from '@river-build/proto'
import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { UserMetadata_Usernames } from './userMetadata_Usernames'
import { UserMetadata_DisplayNames } from './userMetadata_DisplayNames'
import { bin_toHexString } from '@river-build/dlog'
import { userMetadata_EnsAddresses } from './userMetadata_EnsAddresses'
import { userMetadata_Nft } from './userMetadata_Nft'

export type UserInfo = {
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    ensAddress?: string
    nft?: {
        chainId: number
        tokenId: string
        contractAddress: string
    }
}

export class StreamStateView_UserMetadata {
    readonly usernames: UserMetadata_Usernames
    readonly displayNames: UserMetadata_DisplayNames
    readonly ensAddresses: userMetadata_EnsAddresses
    readonly nfts: userMetadata_Nft

    constructor(streamId: string) {
        this.usernames = new UserMetadata_Usernames(streamId)
        this.displayNames = new UserMetadata_DisplayNames(streamId)
        this.ensAddresses = new userMetadata_EnsAddresses(streamId)
        this.nfts = new userMetadata_Nft(streamId)
    }

    applySnapshot(
        usernames: { userId: string; wrappedEncryptedData: WrappedEncryptedData }[],
        displayNames: { userId: string; wrappedEncryptedData: WrappedEncryptedData }[],
        ensAddresses: { userId: string; ensAddress: Uint8Array }[],
        nfts: { userId: string; nft: MemberPayload_Nft }[],
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

        this.ensAddresses.applySnapshot(ensAddresses)
        this.nfts.applySnapshot(nfts)
    }

    onConfirmedEvent(
        confirmedEvent: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        const eventId = confirmedEvent.hashStr
        this.usernames.onConfirmEvent(eventId, stateEmitter)
        this.displayNames.onConfirmEvent(eventId, stateEmitter)
        this.ensAddresses.onConfirmEvent(eventId, stateEmitter)
        this.nfts.onConfirmEvent(eventId, stateEmitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // usernames were conveyed in the snapshot
    }

    appendDisplayName(
        eventId: string,
        data: EncryptedData,
        userId: string,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.displayNames.addEncryptedData(
            eventId,
            data,
            userId,
            true,
            cleartext,
            encryptionEmitter,
            stateEmitter,
        )
    }

    appendUsername(
        eventId: string,
        data: EncryptedData,
        userId: string,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
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

    appendEnsAddress(
        eventId: string,
        EnsAddress: Uint8Array,
        userId: string,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.ensAddresses.addEnsAddressEvent(eventId, EnsAddress, userId, true, stateEmitter)
    }

    appendNft(
        eventId: string,
        nft: MemberPayload_Nft,
        userId: string,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.nfts.addNftEvent(eventId, nft, userId, true, stateEmitter)
    }

    onDecryptedContent(
        eventId: string,
        content: string,
        emitter?: TypedEmitter<StreamStateEvents>,
    ) {
        this.displayNames.onDecryptedContent(eventId, content, emitter)
        this.usernames.onDecryptedContent(eventId, content, emitter)
    }

    userInfo(userId: string): UserInfo {
        const usernameInfo = this.usernames.info(userId)
        const displayNameInfo = this.displayNames.info(userId)
        const ensAddress = this.ensAddresses.info(userId)
        const nft = this.nfts.info(userId)
        return {
            ...usernameInfo,
            ...displayNameInfo,
            ensAddress,
            nft,
        }
    }
}

function sortPayloads(
    payloads: { userId: string; wrappedEncryptedData: WrappedEncryptedData }[],
): { userId: string; wrappedEncryptedData: WrappedEncryptedData }[] {
    return payloads.sort((a, b) => {
        if (a.wrappedEncryptedData.eventNum > b.wrappedEncryptedData.eventNum) {
            return 1
        } else if (a.wrappedEncryptedData.eventNum < b.wrappedEncryptedData.eventNum) {
            return -1
        } else {
            return 0
        }
    })
}
