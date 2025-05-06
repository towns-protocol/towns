import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { Roles__factory } from '@towns-protocol/generated/dev/typings/factories/Roles__factory'
import { IRolesBase } from '@towns-protocol/generated/dev/typings/IRoles'
export type { IRolesBase }

const { abi, connect } = Roles__factory

export class IRolesShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
