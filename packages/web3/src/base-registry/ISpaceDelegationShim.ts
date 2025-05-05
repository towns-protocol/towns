import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ISpaceDelegation__factory } from '@towns-protocol/generated/dev/typings/factories/ISpaceDelegation__factory'

const { abi, connect } = ISpaceDelegation__factory

export class ISpaceDelegationShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
