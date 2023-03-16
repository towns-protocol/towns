/* eslint-disable no-restricted-imports */

import {
    UserEntitlement as GoerliContract,
    UserEntitlementInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/UserEntitlement'
import {
    UserEntitlement as LocalhostContract,
    UserEntitlementInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/UserEntitlement'

import { BaseContractShim } from './BaseContractShim'

export class UserEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
