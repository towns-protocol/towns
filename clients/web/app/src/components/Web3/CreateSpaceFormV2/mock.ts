import { randProductName, randTextRange } from '@ngneat/falso'
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

export const StoreMockForManualSubmissionsNotToBeUsedInTests: CreateSpaceFormState = {
    step1: {
        membershipType: 'tokenHolders',
        // just for easier development, this is the zion token address from council.json, which may change so check it sometimes
        tokens: ['0x9a676e781a523b5d0c0e43731313a708cb607508'],
    },
    step2: {
        spaceName: randProductName().toLowerCase(),
        spaceIconUrl: 'https://picsum.photos/400',
    },
}
