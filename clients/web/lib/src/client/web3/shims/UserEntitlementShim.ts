/* eslint-disable no-restricted-imports */

import {
    UserEntitlement as GoerliContract,
    UserEntitlementInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/UserEntitlement'
import {
    UserEntitlement as LocalhostContract,
    UserEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/UserEntitlement'
import {
    UserEntitlement as SepoliaContract,
    UserEntitlementInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/UserEntitlement'

import { BaseContractShim } from './BaseContractShim'

export class UserEntitlementShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
