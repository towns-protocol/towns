/* eslint-disable no-restricted-imports */

import {
    ITownArchitect as GoerliContract,
    ITownArchitectInterface as GoerliInterface,
} from '@harmony/generated/goerli/v3/typings/ITownArchitect'
import {
    ITownArchitect as LocalhostContract,
    ITownArchitectStructs as LocalhostITownArchitectStructs,
    ITownArchitectInterface as LocalhostInterface,
} from '@harmony/generated/localhost/v3/typings/ITownArchitect'
import {
    ITownArchitect as SepoliaContract,
    ITownArchitectInterface as SepoliaInterface,
} from '@harmony/generated/sepolia/v3/typings/ITownArchitect'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostITownArchitectStructs as ITownArchitectStructs }

export class ITownArchitectShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
