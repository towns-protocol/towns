import { MEMBERSHIP_TYPE, SPACE_ICON_URL, SPACE_NAME, TOKENS } from './constants'

export interface CreateSpaceFormState {
    step1: {
        [MEMBERSHIP_TYPE]: 'everyone' | 'tokenHolders' | null
        [TOKENS]: string[]
    }
    step2: {
        [SPACE_NAME]: string | null
        [SPACE_ICON_URL]: string | null
    }
    createdSpaceId: string | null
    mintedTokenAddress: string | null
}
