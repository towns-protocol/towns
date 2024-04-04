import {
    IWalletLink as LocalhostContract,
    IWalletLinkInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IWalletLink'
import {
    IWalletLink as BaseSepoliaContract,
    IWalletLinkInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IWalletLink'

import LocalhostAbi from '@river-build/generated/dev/abis/WalletLink.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/WalletLink.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IWalletLinkShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }
}
