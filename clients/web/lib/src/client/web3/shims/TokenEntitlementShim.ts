/* eslint-disable no-restricted-imports */

import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/TokenEntitlement'
import {
    TokenEntitlement as SepoliaContract,
    TokenEntitlementInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/TokenEntitlement'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as TokenDataTypes }

export class TokenEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
