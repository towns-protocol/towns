import { IChannelBase } from '@towns-protocol/generated/dev/typings/IChannel'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { IChannel__factory } from '@towns-protocol/generated/dev/typings/factories/IChannel__factory'

export type { IChannelBase }

export class IChannelShim extends BaseContractShim<ContractType<typeof IChannel__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IChannel__factory.connect.bind(IChannel__factory))
    }
}
