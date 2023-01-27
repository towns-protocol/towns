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

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostDataTypes as SpaceDataTypes }

export class SpaceShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface
> {}
