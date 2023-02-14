/* eslint-disable no-restricted-imports */

import {
    UserEntitlement as GoerliContract,
    UserEntitlementInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/UserEntitlement'
import {
    UserEntitlement as LocalhostContract,
    UserEntitlementInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/UserEntitlement'

import { BaseContractShim } from './BaseContractShim'
import { BigNumber } from 'ethers'

export class UserEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {
    public getRoleIdsByChannelId(channelNetworkId: string): Promise<BigNumber[]> {
        switch (this.chainId) {
            case 31337: {
                const localhostTokenEntitlement = this.read as LocalhostContract
                return localhostTokenEntitlement.getRoleIdsByChannelId(channelNetworkId)
            }
            case 5:
                throw new Error('Not implemented')
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }
}
