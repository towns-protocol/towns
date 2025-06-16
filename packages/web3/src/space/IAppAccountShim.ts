import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IAppAccount__factory } from '@towns-protocol/generated/dev/typings/factories/IAppAccount__factory'

const { abi, connect } = IAppAccount__factory

export type { IAppAccount } from '@towns-protocol/generated/dev/typings/IAppAccount'

export class IAppAccountShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
