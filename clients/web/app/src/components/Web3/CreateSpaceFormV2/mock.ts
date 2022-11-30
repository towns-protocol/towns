import { randTextRange } from '@ngneat/falso'
import { CreateSpaceFormState } from './types'

export const MOCK_TOKENS = Array(5)
    .fill(0)
    .map((_, index) => {
        return {
            imgSrc: `https://picsum.photos/id/${index + 20}/400`,
            label: randTextRange({
                min: 5,
                max: 10,
            }),
            contractAddress: `0x71C7656EC7ab88b098defB751B7401B5f6d8976${index + 1}`,
        }
    })

export const StoreMock: CreateSpaceFormState = {
    step1: {
        membershipType: 'tokenHolders',
        tokens: MOCK_TOKENS.map((token) => token.contractAddress),
    },
    step2: {
        spaceName: 'Hot dogs for Algernon',
        spaceIconUrl: 'https://picsum.photos/400',
    },
}
