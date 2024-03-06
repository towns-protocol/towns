import {
    IWalletLink as LocalhostContract,
    IWalletLinkInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IWalletLink'
import {
    IWalletLink as BaseSepoliaContract,
    IWalletLinkInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/IWalletLink'

import LocalhostAbi from '@river/generated/dev/abis/WalletLink.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/WalletLink.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class IWalletLinkShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }
}
