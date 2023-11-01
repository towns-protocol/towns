import {
    IWalletLink as LocalhostContract,
    IWalletLinkInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IWalletLink'
import {
    IWalletLink as BaseGoerliContract,
    IWalletLinkInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IWalletLink'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/WalletLink.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/WalletLink.abi.json' assert { type: 'json' }
import { BaseContractShimV3 } from './BaseContractShimV3'
import { ethers } from 'ethers'

export class IWalletLinkShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
