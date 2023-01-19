/* eslint-disable no-restricted-imports */

import {
    SpaceFactory as GoerliContract,
    SpaceFactoryInterface as GoerliInterface,
} from '@harmony/contracts/goerli/typings/SpaceFactory'
import {
    SpaceFactory as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceFactoryInterface as LocalhostInterface,
} from '@harmony/contracts/localhost/typings/SpaceFactory'

import { BaseContractShimV2 } from './BaseContractShimV2'

export type { LocalhostDataTypes as SpaceFactoryDataTypes }

export class SpaceFactoryShim extends BaseContractShimV2<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
