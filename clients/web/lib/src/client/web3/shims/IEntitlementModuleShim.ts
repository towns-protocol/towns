/* eslint-disable no-restricted-imports */

import {
    IEntitlement as GoerliContract,
    IEntitlementInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/IEntitlement'
import {
    IEntitlement as LocalhostContract,
    IEntitlementInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/IEntitlement'
import {
    IEntitlement as SepoliaContract,
    IEntitlementInterface as SepoliaInterface,
} from '@harmony/generated/sepolia/typings/IEntitlement'

import { BaseContractShim } from './BaseContractShim'

export class IEntitlementModuleShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
