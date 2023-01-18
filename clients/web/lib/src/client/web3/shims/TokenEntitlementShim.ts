/* eslint-disable no-restricted-imports */

import { BaseContractShimV2 } from './BaseContractShimV2'
// V2 smart contracts are not deployed to Goerli yet
//import { Space as GoerliContract } from '@harmony/contracts/goerli/typings/IEntitlementModule'
import {
    TokenEntitlement as LocalhostContract,
    TokenEntitlementInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/TokenEntitlement'

// todo: set GoerliSpace type when deployed to Goerli
export class TokenEntitlementShim extends BaseContractShimV2<
    LocalhostContract,
    LocalhostInterface,
    undefined,
    undefined
> {}
