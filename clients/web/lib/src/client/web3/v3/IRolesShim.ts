/* eslint-disable no-restricted-imports */

import {
    IRoles as GoerliContract,
    IRolesInterface as GoerliInterface,
} from '@harmony/generated/goerli/v3/typings/IRoles'
import {
    IRoles as LocalhostContract,
    IRolesStructs as LocalhostIRolesStructs,
    IRolesInterface as LocalhostInterface,
} from '@harmony/generated/localhost/v3/typings/IRoles'
import {
    IRoles as SepoliaContract,
    IRolesInterface as SepoliaInterface,
} from '@harmony/generated/sepolia/v3/typings/IRoles'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostIRolesStructs as IRolesStructs }

export class IRolesShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
