import { randTextRange } from '@ngneat/falso'

export type MockDataProps = {
    imgSrc: string
    label: string
    contractAddress: string
}

export const MOCK = Array(5)
    .fill(0)
    .map((_, index) => {
        return {
            imgSrc: `/placeholders/nft_${index + 1}.png`,
            label: randTextRange({
                min: 5,
                max: 10,
            }),
            contractAddress: `0x71C7656EC7ab88b098defB751B7401B5f6d8976${index + 1}`,
        }
    })
