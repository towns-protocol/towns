import { EntitlementsManager__factory } from '@towns-protocol/generated/dev/typings/factories/EntitlementsManager__factory'
import { ethers } from 'ethers'
import { IEntitlementsManagerBase } from '@towns-protocol/generated/dev/typings/IEntitlementsManager'
import { BaseContractShim } from '../BaseContractShim'

const { abi, connect } = EntitlementsManager__factory

export type { IEntitlementsManagerBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
