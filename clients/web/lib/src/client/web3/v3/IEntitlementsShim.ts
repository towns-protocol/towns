/* eslint-disable no-restricted-imports */

import {
    IEntitlements as GoerliContract,
    IEntitlementsInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IEntitlements'
import {
    IEntitlements as LocalhostContract,
    IEntitlementsStructs as LocalhostIEntitlementsStructs,
    IEntitlementsInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IEntitlements'
import {
    IEntitlements as SepoliaContract,
    IEntitlementsInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IEntitlements'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostIEntitlementsStructs as IEntitlementsStructs }

export class IEntitlementsShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
