/* eslint-disable no-restricted-imports */

import { BaseContractShimV2 } from './BaseContractShimV2'
// V2 smart contracts are not deployed to Goerli yet
//import { Space as GoerliContract } from '@harmony/contracts/goerli/typings/Space'
import {
    DataTypes as LocalhostDataTypes,
    Space as LocalhostContract,
    SpaceInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Space'

export type { LocalhostDataTypes as SpaceDataTypes }
export type { LocalhostInterface as SpaceInterface }

// todo: set GoerliSpace type when deployed to Goerli
export class SpaceShim extends BaseContractShimV2<
    LocalhostContract,
    LocalhostInterface,
    undefined,
    undefined
> {}
