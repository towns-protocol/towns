import { WrappedEncryptedData, EncryptedData, MemberPayload_Nft } from '@towns-protocol/proto'
import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { MemberMetadata_Usernames } from './memberMetadata_Usernames'
import { MemberMetadata_DisplayNames } from './memberMetadata_DisplayNames'
import { bin_toHexString } from '@towns-protocol/utils'
import { MemberMetadata_EnsAddresses } from './memberMetadata_EnsAddresses'
import { MemberMetadata_Nft } from './memberMetadata_Nft'

export interface Nft {
    chainId: number
    tokenId: string
    contractAddress: string
}

export type UserInfo = {
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    ensAddress?: string
    nft?: Nft
    appAddress?: string
}

export class StreamStateView_MemberMetadata {
    readonly usernames: MemberMetadata_Usernames
    readonly displayNames: MemberMetadata_DisplayNames
    readonly ensAddresses: MemberMetadata_EnsAddresses
    readonly nfts: MemberMetadata_Nft
    readonly appAddresses = new Map<string, string>()
    readonly currentUserId: string
    constructor(streamId: string, currentUserId: string) {
        this.usernames = new MemberMetadata_Usernames(streamId, currentUserId)
        this.displayNames = new MemberMetadata_DisplayNames(streamId)
        this.ensAddresses = new MemberMetadata_EnsAddresses(streamId)
        this.nfts = new MemberMetadata_Nft(streamId)
        this.currentUserId = currentUserId
    }

    applySnapshot(
        usernames: { userId: string; wrappedEncryptedData: WrappedEncryptedData }[],
        displayNames: { userId: string; wrappedEncryptedData: WrappedEncryptedData }[],
        ensAddresses: { userId: string; ensAddress: Uint8Array }[],
        nfts: { userId: string; nft: MemberPayload_Nft }[],
        appAddresses: { userId: string; appAddress: string }[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
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

        for (const item of appAddresses) {
            if (item.appAddress) {
                this.appAddresses.set(item.userId, item.appAddress)
            }
        }
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
        _cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // usernames were conveyed in the snapshot
    }

    appendDisplayName(
        eventId: string,
        data: EncryptedData,
        userId: string,
        cleartext: Uint8Array | string | undefined,
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
        cleartext: Uint8Array | string | undefined,
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
        const appAddress = this.appAddresses.get(userId)
        return {
            ...usernameInfo,
            ...displayNameInfo,
            ensAddress,
            nft,
            appAddress,
        }
    }

    setAppAddress(userId: string, appAddress: string): void {
        this.appAddresses.set(userId, appAddress)
    }

    removeAppAddress(userId: string): void {
        this.appAddresses.delete(userId)
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
