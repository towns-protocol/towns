import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { Channels__factory } from '@towns-protocol/generated/dev/typings/factories/Channels__factory'

const { abi, connect, createInterface } = Channels__factory

export type ChannelStructOutput = ReturnType<
    typeof createInterface
>['structs']['ChannelStructOutput']

export class IChannelShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
