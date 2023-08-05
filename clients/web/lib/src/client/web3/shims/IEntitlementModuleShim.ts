/* eslint-disable no-restricted-imports */

import {
    IEntitlement as GoerliContract,
    IEntitlementInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/IEntitlement'
import {
    IEntitlement as LocalhostContract,
    IEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/IEntitlement'
import {
    IEntitlement as SepoliaContract,
    IEntitlementInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/IEntitlement'

import { BaseContractShim } from './BaseContractShim'

export class IEntitlementModuleShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
