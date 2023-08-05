/* eslint-disable no-restricted-imports */

import {
    Pioneer as GoerliContract,
    PioneerInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/Pioneer'
import {
    Pioneer as LocalhostContract,
    PioneerInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Pioneer'

import {
    Pioneer as SepoliaContract,
    PioneerInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/Pioneer'

import { BaseContractShim } from './BaseContractShim'

export class PioneerNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
