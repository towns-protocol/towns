import { MEMBERSHIP_TYPE, SPACE_ICON_URL, SPACE_NAME, TOKENS } from './constants'

export type TokenProps = {
    imgSrc: string
    label: string
    contractAddress: string
    onClick?: (contractAddress: string) => void
}
export interface CreateSpaceFormState {
    step1: {
        [MEMBERSHIP_TYPE]: 'everyone' | 'tokenHolders' | null
        [TOKENS]: string[]
    }
    step2: {
        [SPACE_NAME]: string | null
        [SPACE_ICON_URL]: string | null
    }
}
