/* eslint-disable no-restricted-imports */

import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/TokenEntitlement'

import { BaseContractShim } from './BaseContractShim'
import { BigNumber } from 'ethers'

export type { LocalhostDataTypes as TokenDataTypes }

export class TokenEntitlementShim extends BaseContractShim<
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
