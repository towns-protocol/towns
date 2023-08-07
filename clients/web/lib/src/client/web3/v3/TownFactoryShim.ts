/* eslint-disable no-restricted-imports */

import {
    TownFactory as GoerliContract,
    TownFactoryInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/TownFactory'
import {
    TownFactory as LocalhostContract,
    TownFactoryInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TownFactory'
import {
    TownFactory as SepoliaContract,
    TownFactoryInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/TownFactory'

import { BaseContractShimV3 } from './BaseContractShimV3'

export class TownFactoryShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
