import {
    IWalletLink as LocalhostContract,
    IWalletLinkInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IWalletLink'

import LocalhostAbi from '@river-build/generated/dev/abis/WalletLink.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IWalletLinkShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
