import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { MEMBERSHIP_TYPE, SPACE_NAME } from '../constants'

// export type TokenDataStruct = {
//     address: string
//     chainId: number
//     tokenIds: number[]
// }

export interface CreateSpaceFormState {
    step1: {
        [MEMBERSHIP_TYPE]: 'everyone' | 'tokenHolders' | null
        // [TOKENS]: TokenDataStruct[]
    }
    step2: {
        [SPACE_NAME]: string | null
    }
    spaceImageData: Omit<UploadImageRequestConfig, 'type' | 'id'> | null
    createdSpaceId: string | null
    mintedTokenAddress: string | null
}
