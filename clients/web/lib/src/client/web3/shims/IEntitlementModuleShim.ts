/* eslint-disable no-restricted-imports */

import {
    IEntitlementModule as GoerliContract,
    IEntitlementModuleInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/IEntitlementModule'
import {
    IEntitlementModule as LocalhostContract,
    IEntitlementModuleInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/IEntitlementModule'

import { BaseContractShim } from './BaseContractShim'

// todo: set GoerliSpace type when deployed to Goerli
export class IEntitlementModuleShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
