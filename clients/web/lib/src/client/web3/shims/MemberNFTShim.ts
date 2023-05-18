/* eslint-disable no-restricted-imports */

import {
    Member as GoerliContract,
    MemberInterface as GoerliInterface,
} from '@harmony/generated/goerli/typings/Member'
import {
    Member as LocalhostContract,
    MemberInterface as LocalhostInterface,
} from '@harmony/generated/localhost/typings/Member'

import {
    Member as SepoliaContract,
    MemberInterface as SepoliaInterface,
} from '@harmony/generated/sepolia/typings/Member'

import { BaseContractShim } from './BaseContractShim'

export class MemberNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {}
