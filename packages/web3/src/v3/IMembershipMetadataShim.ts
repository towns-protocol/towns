import {
    IMembershipMetadata as LocalhostContract,
    IMembershipMetadataInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/IMembershipMetadata'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/IMembershipMetadata.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMembershipMetadataShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface
> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
