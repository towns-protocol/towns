import { ethers } from 'ethers'
import { Address, Hex } from 'viem'
export type UserOpParams = {
    value?: bigint
    signer: ethers.Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: Address
    callData?: Hex
}

type ExecuteBatchData = {
    toAddress?: Address[]
    callData?: Hex[]
}
