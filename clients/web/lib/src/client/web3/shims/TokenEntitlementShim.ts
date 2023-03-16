/* eslint-disable no-restricted-imports */

import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/TokenEntitlement'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as TokenDataTypes }

export class TokenEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
