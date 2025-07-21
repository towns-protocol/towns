import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { WalletLink__factory } from '@towns-protocol/generated/dev/typings/factories/WalletLink__factory'

const { abi, connect } = WalletLink__factory

export class IWalletLinkShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
