/* eslint-disable no-restricted-imports */

import {
    Space as GoerliContract,
    SpaceInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/Space'
import {
    Space as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/Space'

import { BaseContractShimV2 } from './BaseContractShimV2'

export type { LocalhostDataTypes as SpaceDataTypes }
export type { LocalhostInterface as SpaceInterface }

// todo: set GoerliSpace type when deployed to Goerli
export class SpaceShim extends BaseContractShimV2<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
