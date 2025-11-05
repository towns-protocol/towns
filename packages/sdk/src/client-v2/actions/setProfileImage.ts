import { deriveKeyAndIV, encryptAESGCM, uint8ArrayToBase64 } from '@towns-protocol/sdk-crypto'
import type { ClientV2 } from '..'
import {
    ChunkedMediaSchema,
    EncryptedDataSchema,
    type ChunkedMedia,
    type PlainMessage,
} from '@towns-protocol/proto'
import { create, toBinary } from '@bufbuild/protobuf'
import { AES_GCM_DERIVED_ALGORITHM } from '@towns-protocol/encryption'
import { make_UserMetadataPayload_ProfileImage, makeUserMetadataStreamId } from '../..'

/**
 * Gets a chunked media and sets it as the profile image
 * @param client - Towns Client
 * @param chunkedMedia - The chunked media to set as the profile image
 */
const setProfileImage = async (client: ClientV2, chunkedMedia: PlainMessage<ChunkedMedia>) => {
    const { key, iv } = await deriveKeyAndIV(client.userId)
    const { ciphertext } = await encryptAESGCM(
        toBinary(ChunkedMediaSchema, create(ChunkedMediaSchema, chunkedMedia)),
        key,
        iv,
    )
    const encryptedData = create(EncryptedDataSchema, {
        ciphertext: uint8ArrayToBase64(ciphertext),
        algorithm: AES_GCM_DERIVED_ALGORITHM,
    })
    const event = make_UserMetadataPayload_ProfileImage(encryptedData)
    return client.sendEvent(makeUserMetadataStreamId(client.userId), event)
}

export { setProfileImage }
