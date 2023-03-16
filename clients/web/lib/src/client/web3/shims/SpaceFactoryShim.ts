/* eslint-disable no-restricted-imports */

import {
    SpaceFactory as GoerliContract,
    SpaceFactoryInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/SpaceFactory'
import {
    SpaceFactory as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceFactoryInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/SpaceFactory'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as SpaceFactoryDataTypes }

export class SpaceFactoryShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
