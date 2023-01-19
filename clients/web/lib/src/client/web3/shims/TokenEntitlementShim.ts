/* eslint-disable no-restricted-imports */

import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    TokenEntitlementInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/TokenEntitlement'

import { BaseContractShim } from './BaseContractShim'

// todo: set GoerliSpace type when deployed to Goerli
export class TokenEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
