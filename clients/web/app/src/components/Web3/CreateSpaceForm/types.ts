import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { MEMBERSHIP_TYPE, SPACE_NAME, TOKENS } from './constants'

export interface CreateSpaceFormState {
    step1: {
        [MEMBERSHIP_TYPE]: 'everyone' | 'tokenHolders' | null
        [TOKENS]: string[]
    }
    step2: {
        [SPACE_NAME]: string | null
    }
    spaceImageData: Omit<UploadImageRequestConfig, 'type' | 'id'> | null
    createdSpaceId: string | null
    mintedTokenAddress: string | null
}
