import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import {
    Snapshot,
    UserMetadataPayload,
    UserMetadataPayload_EncryptionDevice,
    UserMetadataPayload_Snapshot,
    ChunkedMedia,
    type EncryptedData,
    UserBio,
} from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@river-build/dlog'
import { logNever } from './check'
import { UserDevice } from '@river-build/encryption'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { getUserIdFromStreamId } from './id'
import { decryptDerivedAESGCM } from './crypto_utils'

export class StreamStateView_UserMetadata extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly streamCreatorId: string
    private profileImage: ChunkedMedia | undefined
    private encryptedProfileImage: EncryptedData | undefined
    private bio: UserBio | undefined
    private encryptedBio: EncryptedData | undefined
    private decryptionInProgress: {
        bio: Promise<UserBio> | undefined
        image: Promise<ChunkedMedia> | undefined
    } = { bio: undefined, image: undefined }

    // user_id -> device_keys, fallback_keys
    readonly deviceKeys: UserDevice[] = []

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.streamCreatorId = getUserIdFromStreamId(streamId)
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserMetadataPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // dispatch events for all device keys, todo this seems inefficient?
        for (const value of content.encryptionDevices) {
            this.addUserDeviceKey(value, encryptionEmitter, undefined)
        }
        if (content.profileImage?.data) {
            this.addProfileImage(content.profileImage.data)
        }
        if (content.bio?.data) {
            this.addBio(content.bio.data)
        }
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // nothing to do
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userMetadataPayload')
        const payload: UserMetadataPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'encryptionDevice':
                this.addUserDeviceKey(payload.content.value, encryptionEmitter, stateEmitter)
                break
            case 'profileImage':
                this.addProfileImage(payload.content.value, stateEmitter)
                break
            case 'bio':
                this.addBio(payload.content.value, stateEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserDeviceKey(
        value: UserMetadataPayload_EncryptionDevice,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const device = {
            deviceKey: value.deviceKey,
            fallbackKey: value.fallbackKey,
        } satisfies UserDevice
        const existing = this.deviceKeys.findIndex((x) => x.deviceKey === device.deviceKey)
        if (existing >= 0) {
            this.deviceKeys.splice(existing, 1)
        }
        this.deviceKeys.push(device)
        encryptionEmitter?.emit('userDeviceKeyMessage', this.streamId, this.streamCreatorId, device)
        stateEmitter?.emit('userDeviceKeysUpdated', this.streamId, this.deviceKeys)
    }

    private addProfileImage(
        data: EncryptedData,
        stateEmitter?: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        this.encryptedProfileImage = data
        stateEmitter?.emit('userProfileImageUpdated', this.streamId)
    }

    private addBio(
        data: EncryptedData,
        stateEmitter?: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        this.encryptedBio = data
        stateEmitter?.emit('userBioUpdated', this.streamId)
    }

    public async getProfileImage() {
        // if we have an encrypted space image, decrypt it
        if (this.encryptedProfileImage) {
            const encryptedData = this.encryptedProfileImage
            this.encryptedProfileImage = undefined
            this.decryptionInProgress = {
                ...this.decryptionInProgress,
                image: this.decrypt(
                    encryptedData,
                    (decrypted) => {
                        const profileImage = ChunkedMedia.fromBinary(decrypted)
                        this.profileImage = profileImage
                        return profileImage
                    },
                    () => {
                        this.decryptionInProgress = {
                            ...this.decryptionInProgress,
                            image: undefined,
                        }
                    },
                ),
            }
            return this.decryptionInProgress.image
        }

        // if there isn't an updated encrypted profile image, but a decryption is
        // in progress, return the promise
        if (this.decryptionInProgress.image) {
            return this.decryptionInProgress.image
        }

        return this.profileImage
    }

    public async getBio() {
        // if we have an encrypted bio, decrypt it
        if (this.encryptedBio) {
            const encryptedData = this.encryptedBio
            this.encryptedBio = undefined
            this.decryptionInProgress = {
                ...this.decryptionInProgress,
                bio: this.decrypt(
                    encryptedData,
                    (plaintext) => {
                        const bioPlaintext = UserBio.fromBinary(plaintext)
                        this.bio = bioPlaintext
                        return bioPlaintext
                    },
                    () => {
                        this.decryptionInProgress = {
                            ...this.decryptionInProgress,
                            bio: undefined,
                        }
                    },
                ),
            }
            return this.decryptionInProgress.bio
        }

        // if there isn't an updated encrypted bio, but a decryption is
        // in progress, return the promise
        if (this.decryptionInProgress.bio) {
            return this.decryptionInProgress.bio
        }

        return this.bio
    }

    private async decrypt<T>(
        encryptedData: EncryptedData,
        onDecrypted: (decrypted: Uint8Array) => T,
        cleanup: () => void,
    ): Promise<T> {
        try {
            const userId = getUserIdFromStreamId(this.streamId)
            const context = userId.toLowerCase()
            const plaintext = await decryptDerivedAESGCM(context, encryptedData)
            return onDecrypted(plaintext)
        } finally {
            cleanup()
        }
    }
}
