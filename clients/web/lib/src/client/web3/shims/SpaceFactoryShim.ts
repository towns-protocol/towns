/* eslint-disable no-restricted-imports */

import {
    SpaceFactory as GoerliContract,
    SpaceFactoryInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/SpaceFactory'
import {
    SpaceFactory as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    SpaceFactoryInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/SpaceFactory'
import {
    SpaceFactory as SepoliaContract,
    SpaceFactoryInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/SpaceFactory'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as SpaceFactoryDataTypes }

export class SpaceFactoryShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
