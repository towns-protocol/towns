/* eslint-disable no-restricted-imports */

import {
    IRoles as GoerliContract,
    IRolesInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IRoles'
import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesStructs,
    IRolesInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IRoles'
import {
    IRoles as SepoliaContract,
    IRolesInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IRoles'

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
