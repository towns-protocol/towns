/* eslint-disable no-restricted-imports */

import {
    ITownArchitect as GoerliContract,
    ITownArchitectInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/ITownArchitect'
import {
    ITownArchitect as LocalhostContract,
    ITownArchitectBase as LocalhostITownArchitectBase,
    ITownArchitectInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/ITownArchitect'
import {
    ITownArchitect as SepoliaContract,
    ITownArchitectInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/ITownArchitect'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostITownArchitectBase as ITownArchitectBase }

export class ITownArchitectShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
