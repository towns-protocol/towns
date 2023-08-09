/* eslint-disable no-restricted-imports */

import {
    IPausable as GoerliContract,
    IPausableInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IPausable'
import {
    IPausable as LocalhostContract,
    IPausableInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IPausable'
import {
    IPausable as SepoliaContract,
    IPausableInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IPausable'

import { BaseContractShimV3 } from './BaseContractShimV3'

export class IPausableShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
