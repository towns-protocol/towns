import { BigNumber } from 'ethers'

export // TODO wire up to new ruleData
type TokenGatingMembership = {
    tokens: {
        contractAddress: string
        tokenId: string
        tokenIds: BigNumber[]
        tokenType: string
    }[]
}
